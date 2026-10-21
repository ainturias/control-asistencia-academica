export type Role = 'ADMIN' | 'STUDENT';

/** Usuario autenticado tal como viaja en el token. */
export interface AuthUser {
  id: number;
  role: Role;
  name: string;
  email: string;
  /** Solo para estudiantes: módulo al que pertenecen. */
  moduleId: number | null;
}
