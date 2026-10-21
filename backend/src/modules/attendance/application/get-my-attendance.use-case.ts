import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { StudentContextService } from './student-context.service';
import { StudentHistoryService } from './student-history.service';

/** RF-05: historial personal con resumen; indica si hoy puede marcar y en qué horario. */
@Injectable()
export class GetMyAttendanceUseCase {
  constructor(
    private readonly context: StudentContextService,
    private readonly history: StudentHistoryService,
  ) {}

  async execute(user: AuthUser) {
    const { module, student } = await this.context.resolve(user);
    return this.history.build(module, student, 'student');
  }
}
