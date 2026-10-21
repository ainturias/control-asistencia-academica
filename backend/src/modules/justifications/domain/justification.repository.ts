import type { StoredAttendanceStatus } from '../../attendance/domain/attendance-status';
import type { Justification, JustificationOrigin, JustificationStatus, UploadedImage } from './justification';

export interface CreateJustificationCommand {
  moduleId: number;
  studentId: number;
  sessionId: number;
  origin: JustificationOrigin;
  reason: string;
  status: JustificationStatus;
  resolvedStatus: StoredAttendanceStatus | null;
  reviewedBy: number | null;
  now: Date;
  files: UploadedImage[];
}

export interface JustificationFilters {
  moduleId: number;
  status?: JustificationStatus;
  studentId?: number;
}

export interface ResolveJustificationCommand {
  status: 'APPROVED' | 'REJECTED';
  resolvedStatus: StoredAttendanceStatus | null;
  comment: string | null;
  adminId: number;
  now: Date;
}

export abstract class JustificationRepository {
  abstract create(command: CreateJustificationCommand): Promise<Justification>;
  abstract findById(id: number): Promise<Justification | null>;
  abstract list(filters: JustificationFilters): Promise<Justification[]>;
  abstract findForSession(studentId: number, sessionId: number): Promise<Justification[]>;
  abstract countPending(moduleId: number): Promise<number>;
  /** Solo resuelve si sigue pendiente; devuelve null si otro admin ya la resolvió. */
  abstract resolve(id: number, command: ResolveJustificationCommand): Promise<Justification | null>;
  abstract findFile(justificationId: number, fileId: number): Promise<{ data: Buffer; mimeType: string } | null>;
}
