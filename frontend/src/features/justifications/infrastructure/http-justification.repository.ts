import { http } from '../../../core/http/http-client'
import type { EditableStatus } from '../../attendance/domain/attendance'
import type { Justification, JustificationFilters, JustificationList } from '../domain/justification'
import type { JustificationRepository } from '../domain/justification.repository'

const toForm = (fields: Record<string, string | number>, files: File[]) => {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) form.append(key, String(value))
  for (const file of files) form.append('files', file)
  return form
}

export class HttpJustificationRepository implements JustificationRepository {
  async listMine() {
    const { data } = await http.get<Justification[]>('/justifications/mine')
    return data
  }

  async submit({ sessionId, reason, files }: { sessionId: number; reason: string; files: File[] }) {
    const { data } = await http.post<Justification>('/justifications/mine', toForm({ sessionId, reason }, files))
    return data
  }

  async list(filters: JustificationFilters) {
    const { data } = await http.get<JustificationList>('/justifications', { params: filters })
    return data
  }

  async createByAdmin(input: { studentId: number; sessionId: number; status: EditableStatus; reason: string; files: File[] }) {
    const { files, ...fields } = input
    const { data } = await http.post('/justifications', toForm(fields, files))
    return data
  }

  async approve(id: number, status: EditableStatus, comment?: string) {
    const { data } = await http.post<Justification>(`/justifications/${id}/approve`, { status, comment })
    return data
  }

  async reject(id: number, comment: string) {
    const { data } = await http.post<Justification>(`/justifications/${id}/reject`, { comment })
    return data
  }

  async getFile(id: number, fileId: number) {
    const { data } = await http.get<Blob>(`/justifications/${id}/files/${fileId}`, { responseType: 'blob' })
    return data
  }
}
