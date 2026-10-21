import { http } from '../../../core/http/http-client'
import type { Student, StudentInput } from '../domain/student'
import type { StudentRepository } from '../domain/student.repository'

export class HttpStudentRepository implements StudentRepository {
  async list(search?: string, moduleId?: number, includeInactive?: boolean) {
    const { data } = await http.get<Student[]>('/students', {
      params: { search: search || undefined, moduleId, includeInactive: includeInactive || undefined },
    })
    return data
  }

  async create(input: StudentInput) {
    const { data } = await http.post<Student>('/students', input)
    return data
  }

  async update(id: number, input: StudentInput) {
    const { data } = await http.patch<Student>(`/students/${id}`, input)
    return data
  }

  async setActive(id: number, active: boolean) {
    const { data } = await http.patch<Student>(`/students/${id}/status`, { active })
    return data
  }
}
