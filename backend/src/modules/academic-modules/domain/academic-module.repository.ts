import type { AttendanceRules } from '../../../shared/domain/attendance-rules';
import type { ExtraField } from '../../../shared/domain/extra-fields';
import type { AcademicModule, AcademicModuleSummary, ModuleListItem } from './academic-module';
import type { SessionImport, StudentImport } from './import/import-rows';

export interface ActivateModuleCommand {
  name: string;
  createdBy: number;
  students: StudentImport[];
  sessions: SessionImport[];
  rules: AttendanceRules;
  extraFields: ExtraField[];
  now: Date;
  /** Si se indica, el módulo queda programado para esa fecha en vez de activarse ahora. */
  scheduledFor: Date | null;
}

export abstract class AcademicModuleRepository {
  abstract findActive(): Promise<AcademicModule | null>;
  abstract findById(id: number): Promise<AcademicModule | null>;
  abstract findScheduled(): Promise<AcademicModule | null>;
  abstract summarize(module: AcademicModule): Promise<AcademicModuleSummary>;
  /** Todos los módulos con sus totales, del más reciente al más antiguo. */
  abstract list(today: string, timeZone: string): Promise<ModuleListItem[]>;
  /**
   * RF-13 / RN-01 / RN-08: crea el módulo con sus estudiantes y fechas en una única transacción.
   * Sin fecha programada cierra el módulo activo (sin borrar nada) y activa el nuevo.
   */
  abstract activateNew(command: ActivateModuleCommand): Promise<AcademicModule>;
  /** Activa un módulo programado y cierra el activo. Devuelve null si ya no estaba programado. */
  abstract activateScheduled(
    moduleId: number,
    now: Date,
  ): Promise<{ module: AcademicModule; previous: AcademicModule | null } | null>;
  abstract reschedule(moduleId: number, scheduledFor: Date): Promise<AcademicModule>;
  abstract cancelScheduled(moduleId: number, now: Date): Promise<AcademicModule>;
  abstract updateRules(moduleId: number, rules: AttendanceRules): Promise<AcademicModule>;
  abstract updateExtraFields(moduleId: number, fields: ExtraField[]): Promise<AcademicModule>;
}
