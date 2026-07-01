import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FlotillaPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Flotilla</h1>
        <p className="text-muted-foreground">Administra camiones y conductores.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Vehículos</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center border border-dashed border-border rounded-lg text-muted-foreground">
            Listado de vehículos (Placeholder)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
