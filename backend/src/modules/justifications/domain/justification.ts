import type { StoredAttendanceStatus } from '../../attendance/domain/attendance-status';

export type JustificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
/** STUDENT: la envió el estudiante y espera revisión. ADMIN: la adjuntó el admin al corregir (ya aprobada). */
export type JustificationOrigin = 'STUDENT' | 'ADMIN';

export interface JustificationFileInfo {
  id: number;
  mimeType: string;
  size: number;
}

export interface Justification {
  id: number;
  moduleId: number;
  studentId: number;
  sessionId: number;
  origin: JustificationOrigin;
  reason: string;
  status: JustificationStatus;
  /** Estado de asistencia que se asignó al aprobar. */
  resolvedStatus: StoredAttendanceStatus | null;
  reviewComment: string | null;
  reviewedBy: number | null;
  reviewedAt: Date | null;
  createdAt: Date;
  files: JustificationFileInfo[];
}

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
