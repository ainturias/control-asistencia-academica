import type { AttendanceStatus, EditableStatus } from '../../attendance/domain/attendance'

export type JustificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
/** STUDENT: la envió el estudiante. ADMIN: la adjuntó el admin al corregir (queda aprobada). */
export type JustificationOrigin = 'STUDENT' | 'ADMIN'

export interface JustificationFile {
  id: number
  mimeType: string
  size: number
}

export interface Justification {
  id: number
  studentId: number
  sessionId: number
  origin: JustificationOrigin
  reason: string
  status: JustificationStatus
  resolvedStatus: EditableStatus | null
  reviewComment: string | null
  reviewedAt: string | null
  createdAt: string
  files: JustificationFile[]
}

/** Fila de la bandeja del admin. */
export interface JustificationItem extends Justification {
  student: { id: number; fullName: string; registrationNumber: string }
  session: { id: number; date: string; startTime: string; endTime: string }
  currentStatus: AttendanceStatus
}

export interface JustificationList {
  pending: number
  items: JustificationItem[]
}

export interface JustificationFilters {
  status?: JustificationStatus
  studentId?: number
  moduleId?: number
}

export const JUSTIFICATION_STATUS_LABELS: Record<JustificationStatus, string> = {
  PENDING: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
}

/** Mismas reglas que el servidor, para mostrar u ocultar el botón "Justificar". */
export const MAX_FILES = 4
export const MAX_FILE_BYTES = 3 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)

export function canJustify(
  record: { status: AttendanceStatus; date: string },
  today: string,
  existing: Justification[],
  /** Plazo del módulo; 0 = los estudiantes no pueden justificar. */
  windowDays: number,
): boolean {
  if (windowDays <= 0) return false
  if (record.status !== 'FALTA' && record.status !== 'ATRASO') return false
  const days = daysBetween(record.date, today)
  if (days < 0 || days > windowDays) return false
  return !existing.some((j) => j.status === 'PENDING' || j.status === 'APPROVED')
}

/** Valida las imágenes elegidas antes de enviarlas; devuelve el error o null. */
export function imagesError(files: File[], minimum: number): string | null {
  if (files.length < minimum) return `Adjunta al menos ${minimum} imagen como prueba`
  if (files.length > MAX_FILES) return `Puedes adjuntar hasta ${MAX_FILES} imágenes`
  if (files.some((f) => !IMAGE_TYPES.includes(f.type))) return 'Las pruebas deben ser imágenes JPG, PNG o WEBP'
  if (files.some((f) => f.size > MAX_FILE_BYTES)) return 'Cada imagen puede pesar hasta 3 MB'
  return null
}
