import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { UnauthorizedError } from '../../../shared/domain/errors';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { AdminRepository } from '../../admins/domain/admin.repository';
import { StudentRepository } from '../../students/domain/student.repository';

/** Devuelve el usuario de la sesión, verificando que siga siendo válido. */
@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly admins: AdminRepository,
    private readonly students: StudentRepository,
    private readonly activeModule: ActiveModuleService,
  ) {}

  async execute(user: AuthUser): Promise<AuthUser> {
    if (user.role === 'ADMIN') {
      const admin = await this.admins.findById(user.id);
      if (!admin) throw new UnauthorizedError('Sesión no válida');
      // El nombre puede haber cambiado desde el perfil después de emitir el token.
      return { ...user, name: admin.fullName };
    }
    const module = await this.activeModule.getActive();
    const student = await this.students.findById(user.id);
    if (!module || !student || !student.active || student.moduleId !== module.id) {
      throw new UnauthorizedError('Tu sesión ya no corresponde al módulo activo. Vuelve a ingresar.');
    }
    return user;
  }
}

/** RF-02: cierre de sesión (el token se descarta en el cliente; aquí se audita). */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly activity: ActivityRecorder,
  ) {}

  async execute(user: AuthUser): Promise<void> {
    const module = await this.activeModule.getActive();
    await this.activity.record({
      actor: user,
      action: 'LOGOUT',
      moduleId: module?.id ?? null,
      studentId: user.role === 'STUDENT' ? user.id : null,
      description: `${user.name} cerró sesión`,
    });
  }
}
