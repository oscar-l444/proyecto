import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createDriverSchema, updateDriverSchema } from "@/lib/validations";
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

// GET: Obtener conductores (Todos o individual por ID)
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

    if (id) {
      const driver = await prisma.driver.findFirst({
        where: { id, organizationId },
        include: { user: true },
      });

      if (!driver) {
        return NextResponse.json({ error: "Conductor no encontrado" }, { status: 404 });
      }

      return NextResponse.json(driver);
    }

    const whereClause: any = { organizationId };
    if (status) {
      whereClause.status = status;
    }

    const drivers = await prisma.driver.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(drivers);
  } catch (error) {
    console.error("[DRIVERS_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST: Crear un nuevo conductor
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = createDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    // Si se pasa un userId, validar que exista, sea de la misma organización y tenga rol de CONDUCTOR
    if (parsed.data.userId) {
      const linkedUser = await prisma.userProfile.findUnique({
        where: { id: parsed.data.userId },
      });

      if (!linkedUser) {
        return NextResponse.json({ error: "El usuario vinculado no existe" }, { status: 400 });
      }

      if (linkedUser.organizationId !== auth.profile.organizationId) {
        return NextResponse.json({ error: "El usuario vinculado no pertenece a su organización" }, { status: 400 });
      }
    }

    const driver = await prisma.driver.create({
      data: {
        name: parsed.data.name,
        licenseNumber: parsed.data.licenseNumber,
        licenseExpiration: new Date(parsed.data.licenseExpiration),
        status: parsed.data.status,
        userId: parsed.data.userId,
        organizationId: auth.profile.organizationId,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error("[DRIVERS_POST_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT: Actualizar un conductor existente
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de conductor requerido" }, { status: 400 });
    }

    const driver = await prisma.driver.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!driver) {
      return NextResponse.json({ error: "Conductor no encontrado o no pertenece a su organización" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    // Validar usuario si se intenta cambiar
    if (parsed.data.userId && parsed.data.userId !== driver.userId) {
      const linkedUser = await prisma.userProfile.findUnique({
        where: { id: parsed.data.userId },
      });

      if (!linkedUser) {
        return NextResponse.json({ error: "El usuario vinculado no existe" }, { status: 400 });
      }

      if (linkedUser.organizationId !== auth.profile.organizationId) {
        return NextResponse.json({ error: "El usuario vinculado no pertenece a su organización" }, { status: 400 });
      }
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.licenseExpiration) {
      updateData.licenseExpiration = new Date(parsed.data.licenseExpiration);
    }

    const updatedDriver = await prisma.driver.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    console.error("[DRIVERS_PUT_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE: Eliminar un conductor
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de conductor requerido" }, { status: 400 });
    }

    const driver = await prisma.driver.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!driver) {
      return NextResponse.json({ error: "Conductor no encontrado o no pertenece a su organización" }, { status: 404 });
    }

    await prisma.driver.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Conductor eliminado exitosamente" });
  } catch (error) {
    console.error("[DRIVERS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
