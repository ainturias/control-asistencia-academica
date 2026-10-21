/** SCHEDULED: clase vigente. CANCELLED: no se dicta y no cuenta para la asistencia. */
export type SessionStatus = 'SCHEDULED' | 'CANCELLED';

export interface ClassSession {
  id: number;
  moduleId: number;
  /** YYYY-MM-DD */
  classDate: string;
  /** HH:mm */
  startTime: string;
  endTime: string;
  status: SessionStatus;
  /** Clase de recuperación agregada después de activar el módulo. */
  isMakeup: boolean;
  /** Código que el estudiante debe escribir para marcar (si el módulo lo exige). */
  classCode: string | null;
}
