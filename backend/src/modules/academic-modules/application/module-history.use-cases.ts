import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { BusinessRuleError, NotFoundError } from '../../../shared/domain/errors';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { AcademicModuleRepository } from '../domain/academic-module.repository';
import { ScheduledActivationService } from './scheduled-activation.service';

/** Historial de módulos (solo lectura) y gestión del módulo programado. */
@Injectable()
export class ModuleHistoryService {
  constructor(
    private readonly repository: AcademicModuleRepository,
    private readonly activation: ScheduledActivationService,
    private readonly activity: ActivityRecorder,
    private readonly clock: Clock,
  ) {}

  list() {
    return this.repository.list(this.clock.today(), this.clock.timeZone);
  }

  async get(moduleId: number) {
    const module = await this.repository.findById(moduleId);
    if (!module) throw new NotFoundError('El módulo no existe');
    return this.repository.summarize(module);
  }

  async reschedule(admin: AuthUser, moduleId: number, scheduledFor: Date) {
    if (scheduledFor.getTime() <= this.clock.now().getTime() + 60_000) {
      throw new BusinessRuleError('La fecha programada debe ser al menos un minuto en el futuro');
    }
    const module = await this.repository.reschedule(moduleId, scheduledFor);
    await this.record(admin, 'SCHEDULE_MODULE', module.id, `Reprogramó el módulo "${module.name}"`, {
      scheduledFor: scheduledFor.toISOString(),
    });
    return this.repository.summarize(module);
  }

  async activateNow(admin: AuthUser, moduleId: number) {
    const module = await this.activation.activate(moduleId, admin);
    if (!module) throw new BusinessRuleError('El módulo ya no está programado');
    return this.repository.summarize(module);
  }

  async cancel(admin: AuthUser, moduleId: number) {
    const module = await this.repository.cancelScheduled(moduleId, this.clock.now());
    await this.record(admin, 'CANCEL_SCHEDULE', module.id, `Canceló la activación programada del módulo "${module.name}"`);
    return this.repository.summarize(module);
  }

  private async record(
    admin: AuthUser,
    action: 'SCHEDULE_MODULE' | 'CANCEL_SCHEDULE',
    moduleId: number,
    description: string,
    details?: Record<string, unknown>,
  ) {
    const active = await this.repository.findActive();
    await this.activity.record({
      actor: admin,
      action,
      moduleId: active?.id ?? moduleId,
      entity: 'module',
      entityId: moduleId,
      description,
      details,
    });
  }
}
