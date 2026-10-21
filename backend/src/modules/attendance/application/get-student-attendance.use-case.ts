import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/domain/errors';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { StudentRepository } from '../../students/domain/student.repository';
import { StudentHistoryService } from './student-history.service';

/** Detalle de asistencia de un estudiante del módulo activo, para el administrador. */
@Injectable()
export class GetStudentAttendanceUseCase {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly students: StudentRepository,
    private readonly history: StudentHistoryService,
  ) {}

  async execute(studentId: number, moduleId?: number) {
    const module = await this.activeModule.resolve(moduleId);
    const student = await this.students.findById(studentId);
    if (!student || student.moduleId !== module.id) {
      throw new NotFoundError('El estudiante no pertenece a este módulo');
    }
    return this.history.build(module, student, 'admin');
  }
}
