import type { EditableStatus } from '../../attendance/domain/attendance'
import type { Justification, JustificationFilters, JustificationList } from './justification'

export interface JustificationRepository {
  listMine(): Promise<Justification[]>
  submit(input: { sessionId: number; reason: string; files: File[] }): Promise<Justification>
  list(filters: JustificationFilters): Promise<JustificationList>
  createByAdmin(input: {
    studentId: number
    sessionId: number
    status: EditableStatus
    reason: string
    files: File[]
  }): Promise<unknown>
  approve(id: number, status: EditableStatus, comment?: string): Promise<Justification>
  reject(id: number, comment: string): Promise<Justification>
  getFile(id: number, fileId: number): Promise<Blob>
}
