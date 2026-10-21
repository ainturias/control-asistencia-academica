import { Injectable } from '@nestjs/common';
import { AttendanceRules, ensureValidRules } from '../../../shared/domain/attendance-rules';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { Notifier } from '../../notifications/application/notifier.service';
import { AcademicModuleRepository } from '../domain/academic-module.repository';
import { ActiveModuleService } from './active-module.service';

/** Configura las reglas de puntualidad (Presente / Atraso / Falta) del módulo activo. */
@Injectable()
export class UpdateAttendanceRulesUseCase {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly repository: AcademicModuleRepository,
    private readonly activity: ActivityRecorder,
    private readonly notifier: Notifier,
  ) {}

  async execute(admin: AuthUser, rules: AttendanceRules) {
    ensureValidRules(rules);
    const module = await this.activeModule.getActiveOrFail();
    const updated = await this.repository.updateRules(module.id, rules);

    await this.activity.record({
      actor: admin,
      action: 'UPDATE_RULES',
      moduleId: module.id,
      entity: 'module',
      entityId: module.id,
      description: `${
        rules.enabled
          ? `Puntualidad activada (abre ${rules.openBeforeMinutes} min antes, tolerancia ${rules.toleranceMinutes} min, atraso hasta ${rules.lateLimitMinutes} min)`
          : rules.classHoursOnly
            ? 'Puntualidad desactivada (se marca solo durante el horario de la clase)'
            : 'Puntualidad desactivada (se marca todo el día)'
      } · Presente ${rules.presentPoints} pts, Atraso ${rules.latePoints} pts, mínimo ${rules.minAttendancePercentage}% · ${
        rules.justificationDays ? `justificaciones hasta ${rules.justificationDays} días después` : 'sin justificaciones de estudiantes'
      }${rules.requireClassCode ? ' · exige código de clase' : ''}`,
      details: { previous: module.rules, next: rules },
    });

    if (!rules.enabled && rules.classHoursOnly && !(module.rules.classHoursOnly && !module.rules.enabled)) {
      await this.notifier.toStudents({
        moduleId: module.id,
        type: 'CLASS_HOURS_ONLY_ENABLED',
        title: 'Ahora solo puedes marcar durante el horario de la clase',
        body: 'Tu docente cambió la regla: la asistencia se marca entre la hora de inicio y la de fin de cada clase. Fuera de ese horario ya no se puede marcar.',
        link: '/estudiante',
      });
    }
    if (rules.requireClassCode && !module.rules.requireClassCode) {
      await this.notifier.toStudents({
        moduleId: module.id,
        type: 'CLASS_CODE_ENABLED',
        title: 'Ahora necesitas un código para marcar asistencia',
        body: 'Tu docente activó el código de clase: en cada clase te dará un código (por el chat o en pantalla) que debes escribir al marcar.',
        link: '/estudiante',
      });
    }
    return this.repository.summarize(updated);
  }
}
