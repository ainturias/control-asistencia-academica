import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { Notifier } from '../../notifications/application/notifier.service';
import type { AcademicModule } from '../domain/academic-module';
import { AcademicModuleRepository } from '../domain/academic-module.repository';

const CHECK_EVERY_MS = 30_000;

/**
 * Activa el módulo programado cuando llega su fecha. Revisa cada 30 s y al arrancar,
 * así un servidor apagado en ese momento lo activa en cuanto vuelve.
 */
@Injectable()
export class ScheduledActivationService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledActivationService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly repository: AcademicModuleRepository,
    private readonly activity: ActivityRecorder,
    private readonly notifier: Notifier,
    private readonly clock: Clock,
  ) {}

  onApplicationBootstrap() {
    void this.activateDue();
    this.timer = setInterval(() => void this.activateDue(), CHECK_EVERY_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async activateDue(): Promise<void> {
    try {
      const scheduled = await this.repository.findScheduled();
      if (scheduled?.scheduledFor && scheduled.scheduledFor.getTime() <= this.clock.now().getTime()) {
        await this.activate(scheduled.id, null);
      }
    } catch (error) {
      this.logger.error('No se pudo activar el módulo programado', error);
    }
  }

  /** `admin` null indica que lo activó el sistema al llegar la fecha. */
  async activate(moduleId: number, admin: AuthUser | null): Promise<AcademicModule | null> {
    const result = await this.repository.activateScheduled(moduleId, this.clock.now());
    if (!result) return null;
    const { module, previous } = result;
    this.logger.log(`Módulo programado activado: ${module.name}`);
    await this.activity.record({
      actor: admin ?? {
        id: module.createdBy ?? 0,
        role: 'ADMIN',
        name: 'Sistema (activación programada)',
        email: '',
        moduleId: null,
      },
      action: 'ACTIVATE_MODULE',
      moduleId: module.id,
      entity: 'module',
      entityId: module.id,
      description: admin
        ? `Activó antes de tiempo el módulo programado "${module.name}"`
        : `Se activó automáticamente el módulo programado "${module.name}"`,
      details: { previousModuleId: previous?.id ?? null, previousModuleName: previous?.name ?? null },
    });
    await this.notifier.toAdmins({
      moduleId: module.id,
      type: 'MODULE_ACTIVATED',
      title: admin ? `Activaste el módulo "${module.name}"` : `Se activó automáticamente el módulo "${module.name}"`,
      body: previous ? `El módulo "${previous.name}" pasó a Finalizado; sus datos siguen en Módulos.` : null,
      link: '/admin',
    });
    return module;
  }
}
