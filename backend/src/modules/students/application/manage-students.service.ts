import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/domain/errors';
import { pickExtraValues } from '../../../shared/domain/extra-fields';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { validateStudents } from '../../academic-modules/domain/import/import-validator';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import type { Student } from '../domain/student';
import { StudentData, StudentRepository } from '../domain/student.repository';

export interface StudentInput {
  registrationNumber: string;
  fullName: string;
  email: string;
  extra?: Record<string, string>;
}

const FIELD_LABELS: Record<'registrationNumber' | 'fullName' | 'email', string> = {
  registrationNumber: 'registro',
  fullName: 'nombre',
  email: 'correo',
};

/**
 * Altas, correcciones y bajas de estudiantes del módulo activo. Aplica las mismas reglas que la
 * importación (RF-11 / RN-02) y deja cada cambio en el historial de actividades.
 */
@Injectable()
export class ManageStudentsService {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly students: StudentRepository,
    private readonly activity: ActivityRecorder,
  ) {}

  async create(admin: AuthUser, input: StudentInput) {
    const module = await this.activeModule.getActiveOrFail();
    const data = await this.validate(module.id, module.extraFields, input);
    const student = await this.students.create(module.id, data);
    await this.activity.record({
      actor: admin,
      action: 'ADD_STUDENT',
      moduleId: module.id,
      studentId: student.id,
      entity: 'student',
      entityId: student.id,
      description: `Agregó al estudiante ${student.fullName} (${student.registrationNumber})`,
    });
    return student;
  }

  async update(admin: AuthUser, studentId: number, input: StudentInput) {
    const { module, student } = await this.findInActiveModule(studentId);
    const data = await this.validate(module.id, module.extraFields, input, student.id);
    const updated = await this.students.update(student.id, data);

    const changed = (Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).filter((k) => student[k] !== updated[k]);
    const extraChanged = JSON.stringify(student.extra) !== JSON.stringify(updated.extra);
    if (changed.length || extraChanged) {
      await this.activity.record({
        actor: admin,
        action: 'EDIT_STUDENT',
        moduleId: module.id,
        studentId: student.id,
        entity: 'student',
        entityId: student.id,
        description: `Corrigió los datos de ${updated.fullName}: ${[
          ...changed.map((k) => FIELD_LABELS[k]),
          ...(extraChanged ? ['campos adicionales'] : []),
        ].join(', ')}`,
        details: { before: snapshot(student), after: snapshot(updated) },
      });
    }
    return updated;
  }

  async setActive(admin: AuthUser, studentId: number, active: boolean) {
    const { module, student } = await this.findInActiveModule(studentId);
    if (student.active === active) return student;
    const updated = await this.students.setActive(student.id, active);
    await this.activity.record({
      actor: admin,
      action: active ? 'REACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
      moduleId: module.id,
      studentId: student.id,
      entity: 'student',
      entityId: student.id,
      description: active
        ? `Reincorporó al estudiante ${student.fullName}`
        : `Dio de baja al estudiante ${student.fullName} (sus registros se conservan)`,
    });
    return updated;
  }

  private async findInActiveModule(studentId: number) {
    const module = await this.activeModule.getActiveOrFail();
    const student = await this.students.findById(studentId);
    if (!student || student.moduleId !== module.id) {
      throw new NotFoundError('El estudiante no pertenece al módulo activo');
    }
    return { module, student };
  }

  private async validate(
    moduleId: number,
    extraFields: Parameters<typeof pickExtraValues>[1],
    input: StudentInput,
    excludeId?: number,
  ): Promise<StudentData> {
    const { students, issues } = validateStudents([
      { row: 1, registrationNumber: input.registrationNumber, fullName: input.fullName, email: input.email, extra: {} },
    ]);
    if (issues.length) {
      throw new ValidationError(issues.map((i) => `${i.field}: ${i.message}`).join(' · '), issues);
    }
    const clean = students[0];
    const conflict = await this.students.findConflict(moduleId, clean.registrationNumber, clean.email, excludeId);
    if (conflict) {
      const field = conflict.registrationNumber === clean.registrationNumber ? 'número de registro' : 'correo';
      throw new ConflictError(`Ya existe otro estudiante con ese ${field}: ${conflict.fullName}`);
    }
    return {
      registrationNumber: clean.registrationNumber,
      fullName: clean.fullName,
      email: clean.email,
      extra: pickExtraValues(input.extra, extraFields),
    };
  }
}

const snapshot = (s: Student) => ({
  registrationNumber: s.registrationNumber,
  fullName: s.fullName,
  email: s.email,
  extra: s.extra,
});
