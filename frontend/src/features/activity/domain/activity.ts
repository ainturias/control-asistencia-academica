import type { Role } from '../../auth/domain/auth-user'

export type ActivityAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'MARK_ATTENDANCE'
  | 'EDIT_ATTENDANCE'
  | 'ACTIVATE_MODULE'
  | 'EXPORT_ATTENDANCE'
  | 'UPDATE_RULES'
  | 'SCHEDULE_MODULE'
  | 'CANCEL_SCHEDULE'
  | 'UPDATE_FIELDS'
  | 'ADD_STUDENT'
  | 'EDIT_STUDENT'
  | 'DEACTIVATE_STUDENT'
  | 'REACTIVATE_STUDENT'
  | 'SUBMIT_JUSTIFICATION'
  | 'APPROVE_JUSTIFICATION'
  | 'REJECT_JUSTIFICATION'
  | 'CHANGE_PASSWORD'
  | 'CANCEL_SESSION'
  | 'RESTORE_SESSION'
  | 'RESCHEDULE_SESSION'
  | 'ADD_SESSION'
  | 'SET_CLASS_CODE'

export interface ActivityLog {
  id: number
  actorType: Role
  actorId: number
  actorName: string
  action: ActivityAction
  studentId: number | null
  description: string
  details: Record<string, unknown> | null
  createdAt: string
}

export interface ActivityFilters {
  moduleId?: number
  studentId?: number
  date?: string
  page?: number
  pageSize?: number
}

export interface ActivityPage {
  items: ActivityLog[]
  total: number
  page: number
  pageSize: number
}

export const ACTION_LABELS: Record<ActivityAction, string> = {
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  MARK_ATTENDANCE: 'Marcó asistencia',
  EDIT_ATTENDANCE: 'Modificó asistencia',
  ACTIVATE_MODULE: 'Activó módulo',
  EXPORT_ATTENDANCE: 'Exportó asistencias',
  UPDATE_RULES: 'Cambió reglas de asistencia',
  SCHEDULE_MODULE: 'Programó módulo',
  CANCEL_SCHEDULE: 'Canceló programación',
  UPDATE_FIELDS: 'Cambió campos adicionales',
  ADD_STUDENT: 'Agregó estudiante',
  EDIT_STUDENT: 'Editó estudiante',
  DEACTIVATE_STUDENT: 'Dio de baja',
  REACTIVATE_STUDENT: 'Reincorporó estudiante',
  SUBMIT_JUSTIFICATION: 'Envió justificación',
  APPROVE_JUSTIFICATION: 'Aprobó justificación',
  REJECT_JUSTIFICATION: 'Rechazó justificación',
  CHANGE_PASSWORD: 'Cambió contraseña',
  CANCEL_SESSION: 'Canceló clase',
  RESTORE_SESSION: 'Restauró clase',
  RESCHEDULE_SESSION: 'Reprogramó clase',
  ADD_SESSION: 'Agregó clase de recuperación',
  SET_CLASS_CODE: 'Código de clase',
}

/** Nombre de la acción; si el servidor agrega una nueva antes que la interfaz, se muestra igual. */
export const actionLabel = (action: string) =>
  ACTION_LABELS[action as ActivityAction] ??
  action
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
