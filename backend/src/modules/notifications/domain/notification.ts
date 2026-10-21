import type { Role } from '../../../shared/domain/auth-user';

/** ADMIN: la ve el docente. STUDENT: la ven todos los estudiantes del módulo, o uno si tiene `studentId`. */
export type NotificationAudience = Role;

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
  | 'MODULE_ACTIVATED';

export interface Notification {
  id: number;
  moduleId: number;
  audience: NotificationAudience;
  studentId: number | null;
  type: NotificationType;
  title: string;
  body: string | null;
  /** Ruta de la aplicación a la que lleva la notificación. */
  link: string | null;
  createdAt: Date;
}

export type NewNotification = Omit<Notification, 'id' | 'createdAt'>;
