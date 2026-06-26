import { z } from "zod";
import { VEHICLE_STATUS, DRIVER_STATUS, ROUTE_STATUS, SEVERITY, MAINTENANCE_STATUS } from "./constants";

// Vehicle schemas
export const createVehicleSchema = z.object({
  plates: z.string().min(3).max(15).regex(/^[a-zA-Z0-9-]+$/, "Las placas deben ser alfanuméricas con guiones opcionales"),
  brand: z.string().min(2).max(50),
  model: z.string().min(2).max(50),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 2),
  status: z.nativeEnum(VEHICLE_STATUS).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

// Driver schemas
export const createDriverSchema = z.object({
  name: z.string().min(3).max(100),
  licenseNumber: z.string().min(5).max(30),
  licenseExpiration: z.string().datetime({ message: "Formato de fecha inválido (debe ser ISO-8601)" }),
  status: z.nativeEnum(DRIVER_STATUS).optional(),
  userId: z.string().uuid().optional().nullable(),
});

export const updateDriverSchema = createDriverSchema.partial();

// Route schemas
export const createRouteSchema = z.object({
  origin: z.string().min(3).max(100),
  destination: z.string().min(3).max(100),
  status: z.nativeEnum(ROUTE_STATUS).optional(),
  estimatedDate: z.string().datetime({ message: "Formato de fecha de salida estimado inválido (debe ser ISO-8601)" }),
  vehicleId: z.string().uuid("ID de vehículo inválido"),
  driverId: z.string().uuid("ID de conductor inválido"),
});

export const updateRouteSchema = createRouteSchema.partial();

// Incident schemas
export const createIncidentSchema = z.object({
  routeId: z.string().uuid("ID de ruta inválido"),
  description: z.string().min(5).max(500),
  evidenceUrl: z.string().url("URL de evidencia inválida").optional().nullable().or(z.literal("")),
  severity: z.nativeEnum(SEVERITY),
});

export const updateIncidentSchema = createIncidentSchema.partial();

// Maintenance schemas
export const createMaintenanceSchema = z.object({
  vehicleId: z.string().uuid("ID de vehículo inválido"),
  description: z.string().min(5).max(500),
  date: z.string().datetime({ message: "Formato de fecha de mantenimiento inválido (debe ser ISO-8601)" }),
  cost: z.number().positive("El costo debe ser un valor positivo"),
  status: z.nativeEnum(MAINTENANCE_STATUS).optional(),
});

export const updateMaintenanceSchema = createMaintenanceSchema.partial();
