export type SessionChangeAction = 'CANCEL' | 'RESCHEDULE' | 'ADD' | 'RESTORE'

export interface SessionSnapshot {
  date: string
  startTime: string
  endTime: string
}

/** Cambio en una fecha de clase, con su motivo y fotos (lo ven el admin y los estudiantes). */
export interface SessionChange {
  id: number
  sessionId: number
  adminName: string | null
  action: SessionChangeAction
  previous: SessionSnapshot | null
  next: SessionSnapshot | null
  reason: string
  createdAt: string
  files: { id: number; mimeType: string; size: number }[]
}

export interface SessionInput {
  date: string
  startTime: string
  endTime: string
}

export const CHANGE_LABELS: Record<SessionChangeAction, string> = {
  CANCEL: 'Clase cancelada',
  RESTORE: 'Clase restaurada',
  RESCHEDULE: 'Clase reprogramada',
  ADD: 'Clase de recuperación',
}

export const MAX_CHANGE_PHOTOS = 3
