/**
 * Reglas de asistencia del módulo. La puntualidad (`enabled`) es opcional: apagada, se marca
 * todo el día y siempre es Presente (RF-12). Los puntos y el mínimo aplican siempre.
 */
export interface AttendanceRules {
  enabled: boolean
  openBeforeMinutes: number
  toleranceMinutes: number
  lateLimitMinutes: number
  presentPoints: number
  latePoints: number
  minAttendancePercentage: number
  /** Días después de la clase en que el estudiante puede justificar; 0 = no puede. */
  justificationDays: number
  /** El estudiante debe escribir el código de la clase para marcar. */
  requireClassCode: boolean
  /** Sin puntualidad: marcar solo entre la hora de inicio y la de fin de cada clase (no todo el día). */
  classHoursOnly: boolean
}

/** ACTIVE: en uso. SCHEDULED: se activará en `scheduledFor`. CLOSED: finalizado (solo lectura). */
export type ModuleStatus = 'ACTIVE' | 'SCHEDULED' | 'CLOSED' | 'CANCELLED'

export const MODULE_STATUS_LABELS: Record<ModuleStatus, string> = {
  ACTIVE: 'Activo',
  SCHEDULED: 'Programado',
  CLOSED: 'Finalizado',
  CANCELLED: 'Cancelado',
}

/** Campo adicional de los estudiantes (columna extra del Excel). */
export interface ExtraField {
  key: string
  label: string
  /** Si el estudiante lo ve en su perfil; si no, solo el administrador. */
  visibleToStudent: boolean
}

export interface ActiveModule {
  id: number
  name: string
  status: ModuleStatus
  isActive: boolean
  /** null mientras está programado. */
  activatedAt: string | null
  closedAt: string | null
  scheduledFor: string | null
  rules: AttendanceRules
  extraFields: ExtraField[]
  studentCount: number
  sessionCount: number
  firstDate: string | null
  lastDate: string | null
}

export interface ImportIssue {
  row: number | null
  field: string | null
  message: string
}

/** Fila editable de estudiante en la vista previa. */
export interface StudentDraft {
  registrationNumber: string
  fullName: string
  email: string
  extra: Record<string, string>
}

/** Fecha editable: `date` en AAAA-MM-DD y horas HH:mm (o el texto original si no se pudo interpretar). */
export interface SessionDraft {
  date: string
  startTime: string
  endTime: string
}

export interface ImportDraft {
  students: StudentDraft[]
  sessions: SessionDraft[]
}

export interface ImportErrors {
  students: ImportIssue[]
  sessions: ImportIssue[]
}

/** Columna del Excel que no es obligatoria; se puede guardar como campo adicional. */
export interface ExtraColumn {
  key: string
  header: string
}

export interface ImportPreview {
  valid: boolean
  draft: ImportDraft
  extraColumns: ExtraColumn[]
  /** `row` es la posición en la tabla (1, 2, 3…). */
  errors: ImportErrors
}

export interface ActivateModuleInput {
  name: string
  draft: ImportDraft
  extraFields: ExtraField[]
  /** ISO; sin ella se activa ahora. */
  scheduledFor?: string
}

export interface ImportFiles {
  students: File
  sessions: File
}

/** Fila del historial de módulos. */
export interface ModuleListItem extends ActiveModule {
  teacherName: string | null
  attendancePercentage: number | null
}
