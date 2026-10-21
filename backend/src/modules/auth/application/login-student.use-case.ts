import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { UnauthorizedError } from '../../../shared/domain/errors';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { StudentRepository } from '../../students/domain/student.repository';
import { TokenService } from './token-service.port';

/** RF-01: ingreso con correo o número de registro del módulo activo. */
@Injectable()
export class LoginStudentUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly activeModule: ActiveModuleService,
    private readonly tokens: TokenService,
    private readonly activity: ActivityRecorder,
  ) {}

  async execute(identifier: string) {
    const module = await this.activeModule.getActive();
    if (!module) {
      throw new UnauthorizedError('Todavía no hay un módulo activo. Consulta con tu administrador.');
    }

    const student = await this.students.findByIdentifier(module.id, identifier);
    if (!student) {
      throw new UnauthorizedError(
        'No encontramos ese correo o número de registro en la lista de estudiantes del módulo activo',
      );
    }

    const user: AuthUser = {
      id: student.id,
      role: 'STUDENT',
      name: student.fullName,
      email: student.email,
      moduleId: module.id,
    };
    await this.activity.record({
      actor: user,
      action: 'LOGIN',
      moduleId: module.id,
      studentId: student.id,
      description: `${student.fullName} inició sesión`,
    });

    return { accessToken: await this.tokens.sign(user), user };
  }
}
