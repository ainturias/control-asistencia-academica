export interface Student {
  id: number;
  moduleId: number;
  registrationNumber: string;
  fullName: string;
  email: string;
  /** Valores de los campos adicionales del módulo. */
  extra: Record<string, string>;
  /** false = dado de baja: no puede ingresar ni figura en las asistencias. */
  active: boolean;
}
