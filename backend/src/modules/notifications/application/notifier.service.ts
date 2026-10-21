import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import type { NotificationType } from '../domain/notification';
import { NotificationRepository } from '../domain/notification.repository';

interface NotifyInput {
  moduleId: number;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}

const FEED_LIMIT = 50;

/**
 * Crea y lista las notificaciones guardadas por módulo. Un fallo al notificar no rompe la acción
 * principal (como el historial de actividades).
 */
@Injectable()
export class Notifier {
  private readonly logger = new Logger(Notifier.name);

  constructor(
    private readonly repository: NotificationRepository,
    private readonly activeModule: ActiveModuleService,
    private readonly clock: Clock,
  ) {}

  /** A todos los estudiantes del módulo, o solo a uno si se indica `studentId`. */
  toStudents(input: NotifyInput & { studentId?: number }) {
    return this.save({ ...input, audience: 'STUDENT', studentId: input.studentId ?? null });
  }

  toAdmins(input: NotifyInput) {
    return this.save({ ...input, audience: 'ADMIN', studentId: null });
  }

  /** Las notificaciones del módulo (por defecto el activo) para quien consulta, con cuántas no leyó. */
  async feed(user: AuthUser, moduleId?: number) {
    const module = user.role === 'STUDENT' ? await this.activeModule.getActiveOrFail() : await this.activeModule.resolve(moduleId);
    const scope = { moduleId: module.id, audience: user.role, studentId: user.role === 'STUDENT' ? user.id : undefined };
    const lastSeen = await this.repository.lastSeen(user.role, user.id, module.id);
    const [items, unread] = await Promise.all([
      this.repository.feed({ ...scope, limit: FEED_LIMIT }),
      this.repository.countSince(scope, lastSeen),
    ]);
    return {
      module: { id: module.id, name: module.name },
      unread,
      lastSeenAt: lastSeen,
      items,
    };
  }

  async markSeen(user: AuthUser, moduleId?: number) {
    const module = user.role === 'STUDENT' ? await this.activeModule.getActiveOrFail() : await this.activeModule.resolve(moduleId);
    await this.repository.markSeen(user.role, user.id, module.id, this.clock.now());
  }

  private async save(input: NotifyInput & { audience: 'ADMIN' | 'STUDENT'; studentId: number | null }) {
    try {
      await this.repository.create(
        {
          moduleId: input.moduleId,
          audience: input.audience,
          studentId: input.studentId,
          type: input.type,
          title: input.title.slice(0, 200),
          body: input.body ?? null,
          link: input.link ?? null,
        },
        this.clock.now(),
      );
    } catch (error) {
      this.logger.error(`No se pudo guardar la notificación ${input.type}`, error);
    }
  }
}
