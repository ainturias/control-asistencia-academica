import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { ExtraField, extraFieldKey, normalizeExtraFields } from '../../../shared/domain/extra-fields';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { AcademicModuleRepository } from '../domain/academic-module.repository';
import { ActiveModuleService } from './active-module.service';

/**
 * Renombrar, ocultar/mostrar, agregar o quitar campos adicionales del módulo activo.
 * Quitar un campo no borra los valores guardados: solo deja de mostrarse.
 */
@Injectable()
export class UpdateExtraFieldsUseCase {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly repository: AcademicModuleRepository,
    private readonly activity: ActivityRecorder,
  ) {}

  async execute(admin: AuthUser, fields: ExtraField[]) {
    const module = await this.activeModule.getActiveOrFail();
    const taken = new Set(fields.map((f) => f.key).filter(Boolean));
    // Los campos nuevos llegan sin clave: se genera a partir del nombre.
    const withKeys = fields.map((field) => {
      if (field.key) return field;
      let key = extraFieldKey(field.label);
      for (let n = 2; taken.has(key); n++) key = `${extraFieldKey(field.label).slice(0, 36)}_${n}`;
      taken.add(key);
      return { ...field, key };
    });
    const normalized = normalizeExtraFields(withKeys);
    const updated = await this.repository.updateExtraFields(module.id, normalized);

    await this.activity.record({
      actor: admin,
      action: 'UPDATE_FIELDS',
      moduleId: module.id,
      entity: 'module',
      entityId: module.id,
      description: `Actualizó los campos adicionales: ${normalized.map((f) => f.label).join(', ') || 'ninguno'}`,
      details: { previous: module.extraFields, next: normalized },
    });
    return this.repository.summarize(updated);
  }
}
