import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createVehicleSchema, updateVehicleSchema } from "@/lib/validations";
import { ROLES } from "@/lib/constants";

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

// GET: Obtener vehículos (Listado completo o unidad individual por ID)
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

    // Filtrar siempre por la organización del usuario (multi-tenant)
    const organizationId = auth.profile.organizationId;

    if (id) {
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id,
          organizationId,
        },
      });

      if (!vehicle) {
        return NextResponse.json({ error: "Vehículo no encontrado" }, { status: 404 });
      }

      return NextResponse.json(vehicle);
    }

    // Filtros de listado
    const whereClause: any = { organizationId };
    if (status) {
      whereClause.status = status;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error("[FLEET_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST: Crear un nuevo vehículo
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = createVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    // Validar si las placas ya existen
    const existing = await prisma.vehicle.findUnique({
      where: { plates: parsed.data.plates },
    });

    if (existing) {
      return NextResponse.json({ error: "Ya existe un vehículo registrado con estas placas" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ...parsed.data,
        organizationId: auth.profile.organizationId,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("[FLEET_POST_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT: Actualizar un vehículo existente (especificando ID por query param)
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de vehículo requerido" }, { status: 400 });
    }

    // Validar pertenencia del vehículo al tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehículo no encontrado o no pertenece a su organización" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateVehicleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    // Si actualiza placas, verificar que no existan en otro vehículo
    if (parsed.data.plates && parsed.data.plates !== vehicle.plates) {
      const existing = await prisma.vehicle.findUnique({
        where: { plates: parsed.data.plates },
      });
      if (existing) {
        return NextResponse.json({ error: "Las nuevas placas ya están registradas en otro vehículo" }, { status: 400 });
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error("[FLEET_PUT_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE: Eliminar un vehículo
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de vehículo requerido" }, { status: 400 });
    }

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehículo no encontrado o no pertenece a su organización" }, { status: 404 });
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Vehículo eliminado exitosamente" });
  } catch (error) {
    console.error("[FLEET_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
