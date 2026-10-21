export type NotificationType =
  | 'SESSION_CANCELLED'
  | 'SESSION_RESTORED'
  | 'SESSION_RESCHEDULED'
  | 'SESSION_ADDED'
  | 'CLASS_CODE_ENABLED'
  | 'CLASS_HOURS_ONLY_ENABLED'
  | 'CLASS_CODE_PUBLISHED'
  | 'JUSTIFICATION_APPROVED'
  | 'JUSTIFICATION_REJECTED'
  | 'ATTENDANCE_MARKED'
  | 'JUSTIFICATION_SUBMITTED'
  | 'MODULE_ACTIVATED'

/** Notificación guardada en el servidor, asociada a un módulo. */
export interface AppNotification {
  id: number
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  createdAt: string
}

export interface NotificationFeed {
  module: { id: number; name: string }
  unread: number
  /** Hasta cuándo las vio este usuario (lo guarda el servidor). */
  lastSeenAt: string | null
  items: AppNotification[]
}
