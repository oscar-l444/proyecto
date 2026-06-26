import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
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

// GET: Generar datos agregados para reportes financieros y operativos
export async function GET(request: NextRequest) {
  try {
    // Solo Administrador y Gerente de Operaciones tienen acceso a reportes financieros/operativos
    const auth = await getAuthContext([ROLES.ADMIN, ROLES.OPERACIONES]);

    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const vehicleId = searchParams.get("vehicleId");
    const driverId = searchParams.get("driverId");

    const organizationId = auth.profile.organizationId;

    // Fechas por defecto: últimos 30 días si no se especifican
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(new Date().setDate(endDate.getDate() - 30));

    // --- Filtros ---
    const routeWhere: any = {
      organizationId,
      estimatedDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    const maintenanceWhere: any = {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    const incidentWhere: any = {
      organizationId,
      reportedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (vehicleId) {
      routeWhere.vehicleId = vehicleId;
      maintenanceWhere.vehicleId = vehicleId;
      incidentWhere.route = { vehicleId: vehicleId };
    }

    if (driverId) {
      routeWhere.driverId = driverId;
      incidentWhere.route = { driverId: driverId };
    }

    // --- Consultas en paralelo ---
    const [routes, maintenanceRecords, incidents] = await Promise.all([
      prisma.route.findMany({
        where: routeWhere,
      }),
      prisma.maintenance.findMany({
        where: maintenanceWhere,
      }),
      prisma.incident.findMany({
        where: incidentWhere,
      }),
    ]);

    // --- Procesamiento de Datos ---

    // 1. Resumen de Rutas
    const totalRoutes = routes.length;
    const completedRoutes = routes.filter((r) => r.status === "COMPLETADA").length;
    const inTransitRoutes = routes.filter((r) => r.status === "EN_TRANSITO").length;
    const scheduledRoutes = routes.filter((r) => r.status === "PROGRAMADA").length;
    const cancelledRoutes = routes.filter((r) => r.status === "CANCELADA").length;

    // 2. Resumen de Mantenimientos
    const totalMaintenance = maintenanceRecords.length;
    const totalMaintenanceCost = maintenanceRecords.reduce((acc, curr) => acc + curr.cost, 0);

    // 3. Resumen de Incidencias
    const totalIncidents = incidents.length;
    const highSeverityIncidents = incidents.filter((i) => i.severity === "ALTA").length;
    const mediumSeverityIncidents = incidents.filter((i) => i.severity === "MEDIA").length;
    const lowSeverityIncidents = incidents.filter((i) => i.severity === "BAJA").length;

    // 4. Cálculos de KPIs
    const completionRate = totalRoutes > 0 ? (completedRoutes / totalRoutes) * 100 : 0;
    const incidentRate = totalRoutes > 0 ? (totalIncidents / totalRoutes) * 100 : 0;

    // Formatear la respuesta
    const reportData = {
      filters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        vehicleId: vehicleId || null,
        driverId: driverId || null,
      },
      routesSummary: {
        total: totalRoutes,
        completed: completedRoutes,
        inTransit: inTransitRoutes,
        scheduled: scheduledRoutes,
        cancelled: cancelledRoutes,
        completionRate: parseFloat(completionRate.toFixed(2)),
      },
      maintenanceSummary: {
        totalRecords: totalMaintenance,
        totalCost: parseFloat(totalMaintenanceCost.toFixed(2)),
      },
      incidentsSummary: {
        total: totalIncidents,
        highSeverity: highSeverityIncidents,
        mediumSeverity: mediumSeverityIncidents,
        lowSeverity: lowSeverityIncidents,
        incidentRate: parseFloat(incidentRate.toFixed(2)),
      },
      kpis: {
        routeCompletionPercentage: parseFloat(completionRate.toFixed(2)),
        incidentPercentage: parseFloat(incidentRate.toFixed(2)),
        maintenanceExpenses: parseFloat(totalMaintenanceCost.toFixed(2)),
      },
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error("[REPORTS_GET_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
