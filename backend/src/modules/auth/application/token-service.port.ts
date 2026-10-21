import type { AuthUser } from '../../../shared/domain/auth-user';

export abstract class TokenService {
  abstract sign(user: AuthUser): Promise<string>;
  /** Lanza UnauthorizedError si el token no es válido o expiró. */
  abstract verify(token: string): Promise<AuthUser>;
}
