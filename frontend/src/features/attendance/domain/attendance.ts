import type { AttendanceRules, ExtraField, ModuleStatus } from '../../academic-modules/domain/academic-module'

export type EditableStatus = 'PRESENTE' | 'ATRASO' | 'FALTA' | 'JUSTIFICADO'
/** CANCELADA: la clase se canceló; no cuenta como asistencia ni como falta. */
export type AttendanceStatus = EditableStatus | 'PENDIENTE' | 'PROGRAMADA' | 'CANCELADA'
export type AttendanceSource = 'STUDENT' | 'ADMIN'

/** Estados disponibles sin reglas de puntualidad (RF-07 más Justificado) y con ellas (además Atraso). */
export const BASIC_STATUSES: EditableStatus[] = ['PRESENTE', 'FALTA', 'JUSTIFICADO']
export const ALL_STATUSES: EditableStatus[] = ['PRESENTE', 'ATRASO', 'FALTA', 'JUSTIFICADO']

/** Estados en los que el estudiante marcó (tienen hora de marca). */
export const isAttended = (status: AttendanceStatus) => status === 'PRESENTE' || status === 'ATRASO'

/** Horarios (HH:mm) para marcar la clase de hoy cuando hay reglas de puntualidad. */
export interface MarkWindow {
  opensAt: string
  onTimeUntil: string
  lateUntil: string
}

export interface ClassSession {
  id: number
  classDate: string
  startTime: string
  endTime: string
  /** CANCELLED: clase cancelada (no cuenta). */
  status: 'SCHEDULED' | 'CANCELLED'
  /** Clase de recuperación agregada después de activar el módulo. */
  isMakeup: boolean
  /** Código que el estudiante escribe para marcar (solo lo recibe el admin). */
  classCode: string | null
}

export interface AttendanceRecord {
  sessionId: number
  date: string
  startTime: string
  endTime: string
  status: AttendanceStatus
  markedAt: string | null
  source: AttendanceSource | null
  updatedAt: string | null
  /** null si la sesión aún no se evalúa o está justificada. */
  points: number | null
  maxPoints: number
  /** Motivo que dio el administrador al cambiar el registro. */
  adminNote: string | null
}

/** Segundos que faltaban al momento de la consulta. */
export interface MarkCountdown {
  opensInSeconds: number
  onTimeEndsInSeconds: number | null
  closesInSeconds: number
}

export interface AttendanceSummary {
  total: number
  presentes: number
  atrasos: number
  faltas: number
  justificados: number
  pendientes: number
  programadas: number
  /** Sesiones con estado final. */
  completed: number
  points: number
  maxPoints: number
  percentage: number | null
  atRisk: boolean
}

export interface StudentRef {
  id: number
  registrationNumber: string
  fullName: string
  email: string
  extra: Record<string, string>
}

/** Historial de un estudiante: lo ve él mismo y el administrador en el detalle. */
export interface MyAttendance {
  module: { id: number; name: string; status: ModuleStatus }
  student: StudentRef
  /** Campos adicionales que puede ver quien consulta (al estudiante solo le llegan los visibles). */
  extraFields: ExtraField[]
  today: string
  rules: AttendanceRules
  markWindow: MarkWindow | null
  countdown: MarkCountdown | null
  todayRecord: AttendanceRecord | null
  canMarkToday: boolean
  /** Si el docente ya publicó el código de la clase de hoy (el código en sí nunca llega al estudiante). */
  todayCodePublished: boolean
  records: AttendanceRecord[]
  summary: AttendanceSummary
}

export interface AttendanceOverviewRow {
  student: StudentRef
  records: AttendanceRecord[]
  summary: AttendanceSummary
}

export interface AttendanceOverview {
  module: { id: number; name: string; status: ModuleStatus }
  today: string
  rules: AttendanceRules
  extraFields: ExtraField[]
  sessions: ClassSession[]
  rows: AttendanceOverviewRow[]
  sessionTotals: (AttendanceSummary & { sessionId: number; date: string })[]
  totals: AttendanceSummary
  atRiskCount: number
}

export interface OverviewFilters {
  /** Módulo del historial; sin él, el activo. */
  moduleId?: number
  sessionId?: number
  studentId?: number
  search?: string
}

export interface UpdateAttendanceInput {
  studentId: number
  sessionId: number
  status: EditableStatus
  reason?: string
}

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENTE: 'Presente',
  ATRASO: 'Atraso',
  FALTA: 'Falta',
  JUSTIFICADO: 'Justificado',
  PENDIENTE: 'Pendiente',
  PROGRAMADA: 'Programada',
  CANCELADA: 'Cancelada',
}
