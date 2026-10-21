import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/domain/errors';
import type { AcademicModule } from '../domain/academic-module';
import { AcademicModuleRepository } from '../domain/academic-module.repository';

@Injectable()
export class ActiveModuleService {
  constructor(private readonly repository: AcademicModuleRepository) {}

  getActive(): Promise<AcademicModule | null> {
    return this.repository.findActive();
  }

  async getActiveOrFail(): Promise<AcademicModule> {
    const module = await this.repository.findActive();
    if (!module) {
      throw new NotFoundError(
        'No hay un módulo activo. El administrador debe importar estudiantes y fechas.',
      );
    }
    return module;
  }

  /** Módulo pedido por id (historial) o, si no se indica, el activo. */
  async resolve(moduleId?: number): Promise<AcademicModule> {
    if (moduleId === undefined) return this.getActiveOrFail();
    const module = await this.repository.findById(moduleId);
    if (!module) throw new NotFoundError('El módulo no existe');
    return module;
  }

  async getActiveSummary() {
    const module = await this.repository.findActive();
    return module ? this.repository.summarize(module) : null;
  }
}
