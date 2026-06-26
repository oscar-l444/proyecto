export const ROLES = {
  ADMIN: "ADMIN",
  OPERACIONES: "OPERACIONES",
  SUPERVISOR: "SUPERVISOR",
  CONDUCTOR: "CONDUCTOR",
  CAPTURISTA: "CAPTURISTA",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const VEHICLE_STATUS = {
  ACTIVO: "ACTIVO",
  MANTENIMIENTO: "MANTENIMIENTO",
  INACTIVO: "INACTIVO",
} as const;

export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

export const DRIVER_STATUS = {
  DISPONIBLE: "DISPONIBLE",
  OCUPADO: "OCUPADO",
  INACTIVO: "INACTIVO",
} as const;

export type DriverStatus = (typeof DRIVER_STATUS)[keyof typeof DRIVER_STATUS];

export const ROUTE_STATUS = {
  PROGRAMADA: "PROGRAMADA",
  EN_TRANSITO: "EN_TRANSITO",
  COMPLETADA: "COMPLETADA",
  CANCELADA: "CANCELADA",
} as const;

export type RouteStatus = (typeof ROUTE_STATUS)[keyof typeof ROUTE_STATUS];

export const SEVERITY = {
  BAJA: "BAJA",
  MEDIA: "MEDIA",
  ALTA: "ALTA",
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

export const MAINTENANCE_STATUS = {
  PENDIENTE: "PENDIENTE",
  COMPLETADO: "COMPLETADO",
} as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUS)[keyof typeof MAINTENANCE_STATUS];
