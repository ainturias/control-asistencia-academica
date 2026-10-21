import type { AttendanceRules } from '../../../shared/domain/attendance-rules';
import type { ExtraField } from '../../../shared/domain/extra-fields';

/** ACTIVE: en uso (solo uno). SCHEDULED: se activará en `scheduledFor`. CLOSED: finalizado, solo lectura. */
export type ModuleStatus = 'ACTIVE' | 'SCHEDULED' | 'CLOSED' | 'CANCELLED';

export interface AcademicModule {
  id: number;
  name: string;
  status: ModuleStatus;
  isActive: boolean;
  /** null mientras está programado. */
  activatedAt: Date | null;
  closedAt: Date | null;
  scheduledFor: Date | null;
  /** Administrador que activó el módulo; figura como docente. */
  createdBy: number | null;
  rules: AttendanceRules;
  /** Campos adicionales de los estudiantes de este módulo. */
  extraFields: ExtraField[];
}

export interface AcademicModuleSummary extends AcademicModule {
  studentCount: number;
  sessionCount: number;
  firstDate: string | null;
  lastDate: string | null;
}

/** Fila del historial de módulos. */
export interface ModuleListItem extends AcademicModuleSummary {
  teacherName: string | null;
  /** Asistencia global sobre las clases ya realizadas; null si aún no hubo ninguna. */
  attendancePercentage: number | null;
}
