import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import { TokenService } from '../../application/token-service.port';

interface JwtPayload {
  sub: number;
  role: AuthUser['role'];
  name: string;
  email: string;
  moduleId: number | null;
}

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  sign(user: AuthUser): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      moduleId: user.moduleId,
    };
    return this.jwt.signAsync(payload);
  }

  async verify(token: string): Promise<AuthUser> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return {
        id: payload.sub,
        role: payload.role,
        name: payload.name,
        email: payload.email,
        moduleId: payload.moduleId,
      };
    } catch {
      throw new UnauthorizedError('Tu sesión expiró. Vuelve a ingresar.');
    }
  }
}
