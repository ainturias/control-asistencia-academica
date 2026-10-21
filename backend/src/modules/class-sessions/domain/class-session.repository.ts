import type { ClassSession, SessionStatus } from './class-session';
import type { NewSessionChange, SessionChange } from './session-change';

export interface SessionData {
  classDate: string;
  startTime: string;
  endTime: string;
}

export abstract class ClassSessionRepository {
  abstract findByModule(moduleId: number): Promise<ClassSession[]>;
  abstract findByModuleAndDate(moduleId: number, date: string): Promise<ClassSession | null>;
  abstract findById(id: number): Promise<ClassSession | null>;
  /** Cantidad de registros de asistencia guardados para la clase. */
  abstract countAttendances(sessionId: number): Promise<number>;
  abstract create(moduleId: number, data: SessionData, isMakeup: boolean): Promise<ClassSession>;
  abstract update(id: number, data: SessionData): Promise<ClassSession>;
  abstract setStatus(id: number, status: SessionStatus): Promise<ClassSession>;
  abstract setCode(id: number, code: string | null): Promise<ClassSession>;
  abstract recordChange(change: NewSessionChange): Promise<SessionChange>;
  abstract listChanges(moduleId: number): Promise<SessionChange[]>;
  abstract findChangeFile(changeId: number, fileId: number): Promise<{ data: Buffer; mimeType: string; moduleId: number } | null>;
}
