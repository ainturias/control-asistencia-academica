import type { ClassSession } from '../../attendance/domain/attendance'
import type { SessionChange, SessionInput } from './session-change'

export interface ChangeRequest {
  reason: string
  files: File[]
}

export interface SessionRepository {
  cancel(sessionId: number, request: ChangeRequest): Promise<unknown>
  restore(sessionId: number, request: ChangeRequest): Promise<unknown>
  reschedule(sessionId: number, data: SessionInput, request: ChangeRequest): Promise<unknown>
  add(data: SessionInput, request: ChangeRequest): Promise<unknown>
  setCode(sessionId: number, code: string | null): Promise<ClassSession>
  listChanges(moduleId?: number): Promise<SessionChange[]>
  getChangeFile(changeId: number, fileId: number): Promise<Blob>
}
