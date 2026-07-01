import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MantenimientoPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Mantenimiento</h1>
        <p className="text-muted-foreground">Historial y alertas de servicio.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Órdenes de Servicio</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
            Listado de mantenimientos (Placeholder)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
