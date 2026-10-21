import { http } from '../../../core/http/http-client'
import type { ClassSession } from '../../attendance/domain/attendance'
import type { SessionChange, SessionInput } from '../domain/session-change'
import type { ChangeRequest, SessionRepository } from '../domain/session.repository'

const toForm = (request: ChangeRequest, data?: SessionInput) => {
  const form = new FormData()
  form.append('reason', request.reason)
  if (data) {
    form.append('date', data.date)
    form.append('startTime', data.startTime)
    form.append('endTime', data.endTime)
  }
  for (const file of request.files) form.append('files', file)
  return form
}

export class HttpSessionRepository implements SessionRepository {
  async cancel(sessionId: number, request: ChangeRequest) {
    return (await http.post(`/sessions/${sessionId}/cancel`, toForm(request))).data
  }

  async restore(sessionId: number, request: ChangeRequest) {
    return (await http.post(`/sessions/${sessionId}/restore`, toForm(request))).data
  }

  async reschedule(sessionId: number, data: SessionInput, request: ChangeRequest) {
    return (await http.post(`/sessions/${sessionId}/reschedule`, toForm(request, data))).data
  }

  async add(data: SessionInput, request: ChangeRequest) {
    return (await http.post('/sessions', toForm(request, data))).data
  }

  async setCode(sessionId: number, code: string | null) {
    const { data } = await http.patch<ClassSession>(`/sessions/${sessionId}/code`, { code })
    return data
  }

  async listChanges(moduleId?: number) {
    const { data } = await http.get<SessionChange[]>('/sessions/changes', { params: { moduleId } })
    return data
  }

  async getChangeFile(changeId: number, fileId: number) {
    const { data } = await http.get<Blob>(`/sessions/changes/${changeId}/files/${fileId}`, { responseType: 'blob' })
    return data
  }
}
