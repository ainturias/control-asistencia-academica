import { Injectable } from '@nestjs/common';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ClassSessionRepository } from '../domain/class-session.repository';

@Injectable()
export class ListSessionsUseCase {
  constructor(
    private readonly sessions: ClassSessionRepository,
    private readonly activeModule: ActiveModuleService,
  ) {}

  async execute(moduleId?: number) {
    if (moduleId !== undefined) return this.sessions.findByModule((await this.activeModule.resolve(moduleId)).id);
    const module = await this.activeModule.getActive();
    return module ? this.sessions.findByModule(module.id) : [];
  }
}
