import { http } from '../../../core/http/http-client'
import type { ProfileChanges, TeacherProfile } from '../domain/profile'
import type { ProfileRepository } from '../domain/profile.repository'

export class HttpProfileRepository implements ProfileRepository {
  async get() {
    const { data } = await http.get<TeacherProfile>('/profile')
    return data
  }

  async update(changes: ProfileChanges) {
    const { data } = await http.put<TeacherProfile>('/profile', changes)
    return data
  }

  async getPhoto() {
    const { data } = await http.get<Blob>('/profile/photo', { responseType: 'blob' })
    return data
  }

  async uploadPhoto(file: File) {
    const form = new FormData()
    form.append('photo', file)
    const { data } = await http.post<TeacherProfile>('/profile/photo', form)
    return data
  }

  async getTeacher(moduleId?: number) {
    const { data } = await http.get<{ teacher: TeacherProfile | null }>('/teacher', { params: { moduleId } })
    return data.teacher
  }

  async getTeacherPhoto(moduleId?: number) {
    const { data } = await http.get<Blob>('/teacher/photo', { responseType: 'blob', params: { moduleId } })
    return data
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await http.put('/profile/password', { currentPassword, newPassword })
  }

  async removePhoto() {
    const { data } = await http.delete<TeacherProfile>('/profile/photo')
    return data
  }
}
