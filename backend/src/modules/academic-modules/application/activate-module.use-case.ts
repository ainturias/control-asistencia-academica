import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import { DEFAULT_ATTENDANCE_RULES } from '../../../shared/domain/attendance-rules';
import { ExtraField, normalizeExtraFields, pickExtraValues } from '../../../shared/domain/extra-fields';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { BusinessRuleError, ValidationError } from '../../../shared/domain/errors';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { AcademicModuleRepository } from '../domain/academic-module.repository';
import { ImportDraft, validateDraft } from './preview-module-import.use-case';

export interface ActivateModuleInput {
  name: string;
  confirm: boolean;
  /** Fecha y hora de activación programada; sin ella el módulo se activa ahora. */
  scheduledFor?: Date;
  /** Estudiantes y fechas tal como quedaron en la vista previa (con las correcciones del admin). */
  draft: ImportDraft;
  /** Columnas extra del Excel que el admin eligió guardar. */
  extraFields: ExtraField[];
  admin: AuthUser;
}

@Injectable()
export class ActivateModuleUseCase {
  constructor(
    private readonly repository: AcademicModuleRepository,
    private readonly activity: ActivityRecorder,
    private readonly clock: Clock,
  ) {}

  async execute(input: ActivateModuleInput) {
    if (!input.confirm) {
      throw new BusinessRuleError('Debes confirmar la activación del nuevo módulo');
    }

    // Se vuelve a validar todo en el servidor: lo editado a mano cumple las mismas reglas que el Excel.
    const result = validateDraft(input.draft);
    if (!result.valid) {
      throw new ValidationError('Los datos contienen errores que deben corregirse', result.errors);
    }
    const extraFields = normalizeExtraFields(input.extraFields);
    const students = result.students.map((s) => ({ ...s, extra: pickExtraValues(s.extra, extraFields) }));

    const now = this.clock.now();
    const scheduledFor = input.scheduledFor ?? null;
    if (scheduledFor && scheduledFor.getTime() <= now.getTime() + 60_000) {
      throw new BusinessRuleError('La fecha programada debe ser al menos un minuto en el futuro');
    }

    const previous = await this.repository.findActive();
    const module = await this.repository.activateNew({
      name: input.name.trim(),
      createdBy: input.admin.id,
      students,
      sessions: result.sessions,
      extraFields,
      // El nuevo módulo hereda las reglas de puntualidad del anterior.
      rules: previous?.rules ?? DEFAULT_ATTENDANCE_RULES,
      now,
      scheduledFor,
    });

    if (scheduledFor) {
      await this.activity.record({
        actor: input.admin,
        action: 'SCHEDULE_MODULE',
        // Se registra en el módulo en curso para que aparezca en su historial de actividades.
        moduleId: previous?.id ?? module.id,
        entity: 'module',
        entityId: module.id,
        description: `Programó el módulo "${module.name}" con ${result.students.length} estudiantes y ${result.sessions.length} fechas`,
        details: { scheduledFor: scheduledFor.toISOString(), students: result.students.length, sessions: result.sessions.length },
      });
      return this.repository.summarize(module);
    }

    await this.activity.record({
      actor: input.admin,
      action: 'ACTIVATE_MODULE',
      moduleId: module.id,
      entity: 'module',
      entityId: module.id,
      description: `Activó el módulo "${module.name}" con ${result.students.length} estudiantes y ${result.sessions.length} fechas`,
      details: {
        previousModuleId: previous?.id ?? null,
        previousModuleName: previous?.name ?? null,
        students: result.students.length,
        sessions: result.sessions.length,
      },
    });

    return this.repository.summarize(module);
  }
}
