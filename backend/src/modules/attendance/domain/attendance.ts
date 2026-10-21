import type { AttendanceSource, StoredAttendanceStatus } from './attendance-status';

export interface Attendance {
  id: number;
  moduleId: number;
  studentId: number;
  sessionId: number;
  status: StoredAttendanceStatus;
  source: AttendanceSource;
  /** Fecha y hora reales de la marca del estudiante (RF-03). */
  markedAt: Date | null;
  updatedAt: Date;
  /** Motivo del último cambio hecho por el administrador, si lo dio. */
  adminNote: string | null;
}
