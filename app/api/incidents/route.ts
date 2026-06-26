import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createIncidentSchema, updateIncidentSchema } from "@/lib/validations";
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

// GET: Obtener incidencias (Listado multi-tenant, limitado a su viaje si es Conductor)
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
    const routeId = searchParams.get("routeId");
    const organizationId = auth.profile.organizationId;
    const isConductor = auth.profile.role === ROLES.CONDUCTOR;

    if (id) {
      const incident = await prisma.incident.findFirst({
        where: {
          id,
          organizationId,
          ...(isConductor
            ? {
                route: { driver: { userId: auth.user.id } },
              }
            : {}),
        },
        include: { route: true },
      });

      if (!incident) {
        return NextResponse.json({ error: "Incidencia no encontrada" }, { status: 404 });
      }

      return NextResponse.json(incident);
    }

    const whereClause: any = {
      organizationId,
      ...(isConductor ? { route: { driver: { userId: auth.user.id } } } : {}),
    };

    if (routeId) {
      whereClause.routeId = routeId;
    }

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      include: {
        route: {
          include: {
            vehicle: true,
            driver: true,
          },
        },
      },
      orderBy: { reportedAt: "desc" },
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("[INCIDENTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST: Registrar una nueva incidencia (Supervisor y Conductor autorizados)
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = createIncidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const organizationId = auth.profile.organizationId;
    const isConductor = auth.profile.role === ROLES.CONDUCTOR;

    // Validar existencia de la ruta y pertenencia a la organización
    // Si es conductor, la ruta debe estar asignada a él
    const route = await prisma.route.findFirst({
      where: {
        id: parsed.data.routeId,
        organizationId,
        ...(isConductor ? { driver: { userId: auth.user.id } } : {}),
      },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!route) {
      return NextResponse.json(
        { error: "La ruta especificada no existe o no tiene autorización sobre ella" },
        { status: 400 }
      );
    }

    const incident = await prisma.incident.create({
      data: {
        routeId: parsed.data.routeId,
        description: parsed.data.description,
        evidenceUrl: parsed.data.evidenceUrl,
        severity: parsed.data.severity,
        organizationId,
      },
    });

    // Enviar alerta / notificación al Administrador y Supervisor del tenant
    // usando la fábrica de notificaciones (Factory Method)
    const adminCreator = NotificationFactory.getCreator(ROLES.ADMIN);
    
    // Buscar usuarios administradores/supervisores de la misma organización para alertarles
    const managers = await prisma.userProfile.findMany({
      where: {
        organizationId,
        role: { in: [ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR] },
      },
    });

    for (const manager of managers) {
      const payload = adminCreator.createNotification(
        `Nueva Incidencia Registrada - Ruta #${route.id.substring(0, 8)}`,
        `Gravedad: ${parsed.data.severity}. Descripción: ${parsed.data.description}. Vehículo: ${route.vehicle.plates}`,
        "incidencia"
      );

      // Guardar notificación en base de datos
      await prisma.notification.create({
        data: {
          userId: manager.id,
          title: payload.title,
          message: payload.message,
          type: payload.type,
        },
      });

      // Desencadenar webhook o canales adicionales
      await adminCreator.send(manager.id, payload.title, payload.message, payload.type);
    }

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error("[INCIDENTS_POST_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT: Modificar una incidencia
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES, ROLES.SUPERVISOR]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de incidencia requerido" }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incidencia no encontrada o no pertenece a su organización" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateIncidentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updatedIncident);
  } catch (error) {
    console.error("[INCIDENTS_PUT_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE: Eliminar una incidencia
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de incidencia requerido" }, { status: 400 });
    }

    const incident = await prisma.incident.findFirst({
      where: { id, organizationId: auth.profile.organizationId },
    });

    if (!incident) {
      return NextResponse.json({ error: "Incidencia no encontrada o no pertenece a su organización" }, { status: 404 });
    }

    await prisma.incident.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Incidencia eliminada exitosamente" });
  } catch (error) {
    console.error("[INCIDENTS_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
