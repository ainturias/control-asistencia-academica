export type Role = 'ADMIN' | 'STUDENT'

export interface AuthUser {
  id: number
  role: Role
  name: string
  email: string
  moduleId: number | null
}

export interface LoginResult {
  accessToken: string
  user: AuthUser
}

/** Ruta de inicio según el rol. */
export const homePathFor = (role: Role) => (role === 'ADMIN' ? '/admin' : '/estudiante')
