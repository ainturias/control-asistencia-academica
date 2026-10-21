import type { Attendance } from './attendance';
import type { AttendanceDisplayStatus, StoredAttendanceStatus } from './attendance-status';

export interface RegisterStudentMarkCommand {
  moduleId: number;
  studentId: number;
  sessionId: number;
  status: StoredAttendanceStatus;
  markedAt: Date;
}

export interface ApplyAdminChangeCommand {
  moduleId: number;
  studentId: number;
  sessionId: number;
  previousStatus: AttendanceDisplayStatus;
  newStatus: StoredAttendanceStatus;
  adminId: number;
  reason: string | null;
  now: Date;
}

export abstract class AttendanceRepository {
  abstract findByModule(moduleId: number): Promise<Attendance[]>;
  abstract findByStudent(studentId: number): Promise<Attendance[]>;
  abstract findOne(studentId: number, sessionId: number): Promise<Attendance | null>;
  /** RN-03: lanza ConflictError si ya existe una marca para ese estudiante y fecha. */
  abstract registerStudentMark(command: RegisterStudentMarkCommand): Promise<Attendance>;
  /** RF-07 / RN-07: crea o actualiza el registro y guarda la auditoría en la misma transacción. */
  abstract applyAdminChange(command: ApplyAdminChangeCommand): Promise<Attendance>;
}
