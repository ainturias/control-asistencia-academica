import { http } from '../../../core/http/http-client'
import type { AuthUser, LoginResult } from '../domain/auth-user'
import type { AuthRepository } from '../domain/auth.repository'

export class HttpAuthRepository implements AuthRepository {
  async loginAdmin(email: string, password: string) {
    const { data } = await http.post<LoginResult>('/auth/admin/login', { email, password })
    return data
  }

  async loginStudent(identifier: string) {
    const { data } = await http.post<LoginResult>('/auth/student/login', { identifier })
    return data
  }

  async me() {
    const { data } = await http.get<{ user: AuthUser }>('/auth/me')
    return data.user
  }

  async logout() {
    await http.post('/auth/logout')
  }
}
