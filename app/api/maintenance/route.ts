import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createMaintenanceSchema, updateMaintenanceSchema } from "@/lib/validations";
import { ROLES } from "@/lib/constants";
import { NotificationFactory } from "@/types/notifications";

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

// GET: Obtener mantenimientos (Listado filtrado por organización)
export async function GET(request: NextRequest) {
  try {
    // Los conductores no tienen acceso al módulo de mantenimientos general
    const auth = await getAuthContext([
      ROLES.ADMIN,
      ROLES.OPERACIONES,
      ROLES.SUPERVISOR,
      ROLES.CAPTURISTA,
    ]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const vehicleId = searchParams.get("vehicleId");
    const organizationId = auth.profile.organizationId;

    if (id) {
      const maintenance = await prisma.maintenance.findFirst({
        where: { id, organizationId },
        include: { vehicle: true },
      });

      if (!maintenance) {
        return NextResponse.json({ error: "Mantenimiento no encontrado" }, { status: 404 });
      }

      return NextResponse.json(maintenance);
    }

    const whereClause: any = { organizationId };
    if (vehicleId) {
      whereClause.vehicleId = vehicleId;
    }

    const records = await prisma.maintenance.findMany({
      where: whereClause,
      include: { vehicle: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("[MAINTENANCE_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST: Registrar un mantenimiento programado o realizado
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.CAPTURISTA]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = createMaintenanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const organizationId = auth.profile.organizationId;

    // Verificar que el vehículo exista y sea de su organización
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: parsed.data.vehicleId, organizationId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "El vehículo especificado no existe o no pertenece a su organización" },
        { status: 400 }
      );
    }

    const record = await prisma.maintenance.create({
      data: {
        vehicleId: parsed.data.vehicleId,
        description: parsed.data.description,
        date: new Date(parsed.data.date),
        cost: parsed.data.cost,
        status: parsed.data.status,
        organizationId,
      },
    });

    // Cambiar estado de vehículo si es mantenimiento activo
    if (parsed.data.status === "PENDIENTE" || !parsed.data.status) {
      await prisma.vehicle.update({
        where: { id: parsed.data.vehicleId },
        data: { status: "MANTENIMIENTO" },
      });
    }

    // Trigger de notificación automática por vencimiento/mantenimiento
    // (Factory Method)
    const notificationCreator = NotificationFactory.getCreator(ROLES.OPERACIONES);
    const notificationPayload = notificationCreator.createNotification(
      "Mantenimiento Programado",
      `Vehículo: ${vehicle.brand} ${vehicle.model} (${vehicle.plates}). Descripción: ${parsed.data.description}. Fecha: ${new Date(parsed.data.date).toLocaleDateString()}`,
      "mantenimiento"
    );

    // Obtener los supervisores/gerentes de la misma organización para alertarles
    const usersToNotify = await prisma.userProfile.findMany({
      where: {
        organizationId,
        role: { in: [ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR] },
      },
    });

    for (const user of usersToNotify) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: notificationPayload.title,
          message: notificationPayload.message,
          type: notificationPayload.type,
        },
      });

      await notificationCreator.send(user.id, notificationPayload.title, notificationPayload.message, notificationPayload.type);
    }

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("[MAINTENANCE_POST_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT: Actualizar un mantenimiento
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.CAPTURISTA]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de mantenimiento requerido" }, { status: 400 });
    }

    const organizationId = auth.profile.organizationId;

    const record = await prisma.maintenance.findFirst({
      where: { id, organizationId },
    });

    if (!record) {
      return NextResponse.json({ error: "Registro de mantenimiento no encontrado o no pertenece a su organización" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateMaintenanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const updateData: any = { ...parsed.data };
    if (parsed.data.date) {
      updateData.date = new Date(parsed.data.date);
    }

    const updatedRecord = await prisma.maintenance.update({
      where: { id },
      data: updateData,
    });

    // Si el estado se marca como COMPLETADO, regresar el vehículo a estado ACTIVO si no hay otros mantenimientos pendientes
    if (parsed.data.status === "COMPLETADO") {
      const activeMaintenance = await prisma.maintenance.findFirst({
        where: {
          vehicleId: record.vehicleId,
          status: "PENDIENTE",
          id: { not: id },
        },
      });

      if (!activeMaintenance) {
        await prisma.vehicle.update({
          where: { id: record.vehicleId },
          data: { status: "ACTIVO" },
        });
      }
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("[MAINTENANCE_PUT_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE: Eliminar registro de mantenimiento
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de mantenimiento requerido" }, { status: 400 });
    }

    const record = await prisma.maintenance.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!record) {
      return NextResponse.json({ error: "Registro de mantenimiento no encontrado o no pertenece a su organización" }, { status: 404 });
    }

    await prisma.maintenance.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Registro de mantenimiento eliminado exitosamente" });
  } catch (error) {
    console.error("[MAINTENANCE_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
