import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, AlertTriangle, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Resumen General</h1>
        <p className="text-muted-foreground">Monitorea el estado de la flotilla en tiempo real.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards */}
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Camiones</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground mt-1 text-success flex items-center gap-1">
              +2 este mes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Ruta</CardTitle>
            <RouteIcon className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32</div>
            <p className="text-xs text-success mt-1">Óptimo</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Mantenimiento</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-warning mt-1">2 preventivos, 3 correctivos</p>
          </CardContent>
        </Card>

        <Card className="bg-[var(--destructive)] text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white/80">Alertas Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-white/80 mt-1">Atención inmediata requerida</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card">
          <CardHeader>
            <CardTitle>Eficiencia de Rutas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full flex items-end gap-2 pt-4">
              {/* Placeholder for chart */}
              <div className="flex-1 bg-primary/20 rounded-t-sm h-[40%]"></div>
              <div className="flex-1 bg-primary/40 rounded-t-sm h-[60%]"></div>
              <div className="flex-1 bg-primary/60 rounded-t-sm h-[80%]"></div>
              <div className="flex-1 bg-primary rounded-t-sm h-[100%]"></div>
              <div className="flex-1 bg-primary/80 rounded-t-sm h-[70%]"></div>
              <div className="flex-1 bg-primary/50 rounded-t-sm h-[50%]"></div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-card">
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4 p-3 bg-success/10 text-success rounded-xl cursor-pointer hover:bg-success/20 transition-colors">
              <CheckCircle className="w-5 h-5" />
              <div className="font-medium text-sm">Asignar Nueva Ruta</div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-warning/10 text-warning rounded-xl cursor-pointer hover:bg-warning/20 transition-colors">
              <Clock className="w-5 h-5" />
              <div className="font-medium text-sm">Registrar Mantenimiento</div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-[var(--destructive)]/10 text-[var(--destructive)] rounded-xl cursor-pointer hover:bg-[var(--destructive)]/20 transition-colors">
              <AlertTriangle className="w-5 h-5" />
              <div className="font-medium text-sm">Reportar Incidente</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RouteIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}
