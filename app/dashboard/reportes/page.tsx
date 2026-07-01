import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Exportación y análisis de datos.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Generar Reporte</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
            Filtros y tabla de reportes (Placeholder)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
