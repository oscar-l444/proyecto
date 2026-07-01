import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RutasPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Rutas y Logística</h1>
        <p className="text-muted-foreground">Asignación de rutas y monitoreo.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Rutas Activas</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
            Mapa / Listado de rutas (Placeholder)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
