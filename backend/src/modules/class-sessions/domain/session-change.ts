import type { UploadedImage } from '../../justifications/domain/justification';

export type SessionChangeAction = 'CANCEL' | 'RESCHEDULE' | 'ADD' | 'RESTORE';

/** Fecha y horario de una clase en un momento dado (antes o después del cambio). */
export interface SessionSnapshot {
  date: string;
  startTime: string;
  endTime: string;
}

export interface SessionChange {
  id: number;
  moduleId: number;
  sessionId: number;
  adminId: number | null;
  adminName: string | null;
  action: SessionChangeAction;
  previous: SessionSnapshot | null;
  next: SessionSnapshot | null;
  reason: string;
  createdAt: Date;
  files: { id: number; mimeType: string; size: number }[];
}

export interface NewSessionChange {
  moduleId: number;
  sessionId: number;
  adminId: number;
  action: SessionChangeAction;
  previous: SessionSnapshot | null;
  next: SessionSnapshot | null;
  reason: string;
  now: Date;
  files: UploadedImage[];
}

export const MAX_CHANGE_PHOTOS = 3;
