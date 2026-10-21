import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { UnauthorizedError } from '../../../shared/domain/errors';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { PasswordHasher } from '../../admins/application/password-hasher.port';
import { AdminRepository } from '../../admins/domain/admin.repository';
import { TokenService } from './token-service.port';

/** RF-02: acceso del administrador con credenciales propias. */
@Injectable()
export class LoginAdminUseCase {
  constructor(
    private readonly admins: AdminRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
    private readonly activeModule: ActiveModuleService,
    private readonly activity: ActivityRecorder,
  ) {}

  async execute(email: string, password: string) {
    const admin = await this.admins.findByEmail(email);
    if (!admin || !(await this.hasher.compare(password, admin.passwordHash))) {
      throw new UnauthorizedError('Correo o contraseña incorrectos');
    }

    const user: AuthUser = {
      id: admin.id,
      role: 'ADMIN',
      name: admin.fullName,
      email: admin.email,
      moduleId: null,
    };
    const module = await this.activeModule.getActive();
    await this.activity.record({
      actor: user,
      action: 'LOGIN',
      moduleId: module?.id ?? null,
      description: `${admin.fullName} inició sesión como administrador`,
    });

    return { accessToken: await this.tokens.sign(user), user };
  }
}
