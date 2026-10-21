import type { Role } from '../../../shared/domain/auth-user';

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
  | 'SET_CLASS_CODE';

export interface ActivityLog {
  id: number;
  moduleId: number | null;
  actorType: Role;
  actorId: number;
  actorName: string;
  action: ActivityAction;
  studentId: number | null;
  entity: string | null;
  entityId: number | null;
  description: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export type NewActivityLog = Omit<ActivityLog, 'id'>;

export interface ActivitySearchCriteria {
  moduleId: number;
  studentId?: number;
  /** YYYY-MM-DD en la zona horaria de la aplicación. */
  date?: string;
  timeZone: string;
  page: number;
  pageSize: number;
}
