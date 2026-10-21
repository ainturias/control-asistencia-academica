import { Injectable } from '@nestjs/common';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { StudentRepository } from '../domain/student.repository';

/** RF-06: lista del módulo activo con búsqueda por nombre o registro. */
@Injectable()
export class ListStudentsUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly activeModule: ActiveModuleService,
  ) {}

  async execute(search?: string, moduleId?: number, includeInactive = false) {
    const module =
      moduleId !== undefined ? await this.activeModule.resolve(moduleId) : await this.activeModule.getActive();
    if (!module) return [];
    return this.students.findByModule(module.id, search?.trim() || undefined, includeInactive);
  }
}
