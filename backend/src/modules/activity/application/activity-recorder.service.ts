import { Injectable, Logger } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import { RealtimeEvents } from '../../../shared/application/realtime.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import type { ActivityAction } from '../domain/activity-log';
import { ActivityLogRepository } from '../domain/activity-log.repository';

export interface RecordActivityInput {
  actor: AuthUser;
  action: ActivityAction;
  description: string;
  moduleId: number | null;
  studentId?: number | null;
  entity?: string;
  entityId?: number;
  details?: Record<string, unknown>;
}

/** Acciones que solo interesan a los administradores (no cambian lo que ve un estudiante). */
const ADMIN_ONLY: ReadonlySet<ActivityAction> = new Set([
  'LOGIN',
  'LOGOUT',
  'EXPORT_ATTENDANCE',
  'CHANGE_PASSWORD',
  'SCHEDULE_MODULE',
  'CANCEL_SCHEDULE',
]);

/**
 * Registra las acciones importantes (RF-09). Un fallo aquí no rompe la operación principal.
 * Como toda acción que cambia datos pasa por aquí, también avisa en tiempo real a quienes la ven.
 */
@Injectable()
export class ActivityRecorder {
  private readonly logger = new Logger(ActivityRecorder.name);

  constructor(
    private readonly repository: ActivityLogRepository,
    private readonly clock: Clock,
    private readonly realtime: RealtimeEvents,
  ) {}

  async record(input: RecordActivityInput): Promise<void> {
    try {
      await this.repository.save({
        moduleId: input.moduleId,
        actorType: input.actor.role,
        actorId: input.actor.id,
        actorName: input.actor.name,
        action: input.action,
        studentId: input.studentId ?? null,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        description: input.description,
        details: input.details ?? null,
        createdAt: this.clock.now(),
      });
    } catch (error) {
      this.logger.error(`No se pudo registrar la actividad ${input.action}`, error);
    }
    this.broadcast(input);
  }

  private broadcast({ action, actor, moduleId, studentId }: RecordActivityInput): void {
    const event = { action };
    // Al cambiar de módulo, los estudiantes del anterior deben enterarse de que su sesión terminó.
    if (action === 'ACTIVATE_MODULE') return this.realtime.toEveryone(event);

    this.realtime.toAdmins(event);
    if (actor.role === 'STUDENT') {
      // Sus otras pestañas o dispositivos.
      this.realtime.toStudent(actor.id, event);
    } else if (moduleId !== null && !ADMIN_ONLY.has(action)) {
      // Si la acción es sobre un estudiante, solo a él; si no (clases, reglas…), a todo el módulo.
      if (studentId) this.realtime.toStudent(studentId, event);
      else this.realtime.toModuleStudents(moduleId, event);
    }
  }
}
