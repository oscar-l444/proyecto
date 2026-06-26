import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createRouteSchema, updateRouteSchema } from "@/lib/validations";
import { ROLES, ROUTE_STATUS } from "@/lib/constants";

// Helper to authenticate user and check permissions
async function getAuthContext(allowedRoles?: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado", status: 401 };
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    return { error: "Perfil de usuario no encontrado", status: 403 };
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return { error: "No autorizado para realizar esta acción", status: 403 };
  }

  return { profile, user };
}

// GET: Obtener rutas (Listado multi-tenant, filtrado por conductor si es el rol asignado)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext([
      ROLES.ADMIN,
      ROLES.OPERACIONES,
      ROLES.SUPERVISOR,
      ROLES.CONDUCTOR,
      ROLES.CAPTURISTA,
    ]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const organizationId = auth.profile.organizationId;

    // Restricción de Conductor: solo ve sus rutas asignadas
    const isConductor = auth.profile.role === ROLES.CONDUCTOR;

    if (id) {
      const route = await prisma.route.findFirst({
        where: {
          id,
          organizationId,
          ...(isConductor
            ? {
                driver: { userId: auth.user.id },
              }
            : {}),
        },
        include: {
          vehicle: true,
          driver: true,
          incidents: true,
        },
      });

      if (!route) {
        return NextResponse.json({ error: "Ruta no encontrada" }, { status: 404 });
      }

      return NextResponse.json(route);
    }

    const whereClause: any = {
      organizationId,
      ...(isConductor
        ? {
            driver: { userId: auth.user.id },
          }
        : {}),
    };

    if (status) {
      whereClause.status = status;
    }

    const routes = await prisma.route.findMany({
      where: whereClause,
      include: {
        vehicle: true,
        driver: true,
      },
      orderBy: { estimatedDate: "asc" },
    });

    return NextResponse.json(routes);
  } catch (error) {
    console.error("[ROUTES_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST: Crear una nueva ruta
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = createRouteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const organizationId = auth.profile.organizationId;

    // Validar que el vehículo exista y sea del mismo tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: parsed.data.vehicleId, organizationId },
    });
    if (!vehicle) {
      return NextResponse.json({ error: "El vehículo especificado no existe o no pertenece a su organización" }, { status: 400 });
    }

    // Validar que el conductor exista y sea del mismo tenant
    const driver = await prisma.driver.findFirst({
      where: { id: parsed.data.driverId, organizationId },
    });
    if (!driver) {
      return NextResponse.json({ error: "El conductor especificado no existe o no pertenece a su organización" }, { status: 400 });
    }

    const route = await prisma.route.create({
      data: {
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        status: parsed.data.status || ROUTE_STATUS.PROGRAMADA,
        estimatedDate: new Date(parsed.data.estimatedDate),
        vehicleId: parsed.data.vehicleId,
        driverId: parsed.data.driverId,
        organizationId,
      },
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error("[ROUTES_POST_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT: Actualizar una ruta existente (admite actualización de estado por Conductores)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext([
      ROLES.ADMIN,
      ROLES.OPERACIONES,
      ROLES.SUPERVISOR,
      ROLES.CONDUCTOR,
    ]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de ruta requerido" }, { status: 400 });
    }

    const organizationId = auth.profile.organizationId;
    const isConductor = auth.profile.role === ROLES.CONDUCTOR;

    // Obtener ruta y verificar tenant
    const route = await prisma.route.findFirst({
      where: {
        id,
        organizationId,
        ...(isConductor ? { driver: { userId: auth.user.id } } : {}),
      },
      include: { driver: true },
    });

    if (!route) {
      return NextResponse.json(
        { error: "Ruta no encontrada o no pertenece a su organización/viajes asignados" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateRouteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    // Regla de negocio: Si es conductor, SOLO puede actualizar el status, no el resto de campos
    if (isConductor) {
      const allowedKeys = ["status"];
      const updateKeys = Object.keys(parsed.data);
      const isTryingToUpdateOtherFields = updateKeys.some((k) => k !== "status");

      if (isTryingToUpdateOtherFields) {
        return NextResponse.json({ error: "Los conductores solo están autorizados a actualizar el estado de su viaje" }, { status: 403 });
      }
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.estimatedDate) {
      updateData.estimatedDate = new Date(parsed.data.estimatedDate);
    }

    // Si se actualizan vehículo o conductor, validar que existan en la organización
    if (!isConductor && parsed.data.vehicleId) {
      const vehicle = await prisma.vehicle.findFirst({
        where: { id: parsed.data.vehicleId, organizationId },
      });
      if (!vehicle) {
        return NextResponse.json({ error: "Vehículo inválido" }, { status: 400 });
      }
    }

    if (!isConductor && parsed.data.driverId) {
      const driver = await prisma.driver.findFirst({
        where: { id: parsed.data.driverId, organizationId },
      });
      if (!driver) {
        return NextResponse.json({ error: "Conductor inválido" }, { status: 400 });
      }
    }

    const updatedRoute = await prisma.route.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedRoute);
  } catch (error) {
    console.error("[ROUTES_PUT_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE: Eliminar una ruta
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de ruta requerido" }, { status: 400 });
    }

    const route = await prisma.route.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!route) {
      return NextResponse.json({ error: "Ruta no encontrada o no pertenece a su organización" }, { status: 404 });
    }

    await prisma.route.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Ruta eliminada exitosamente" });
  } catch (error) {
    console.error("[ROUTES_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
