import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AttendanceRules } from '../../../../shared/domain/attendance-rules';
import type { ExtraField } from '../../../../shared/domain/extra-fields';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import { isUniqueViolation } from '../../../../shared/infrastructure/persistence-errors';
import { ClassSessionOrmEntity } from '../../../class-sessions/infrastructure/persistence/class-session.orm-entity';
import { StudentOrmEntity } from '../../../students/infrastructure/persistence/student.orm-entity';
import type { AcademicModule, AcademicModuleSummary, ModuleListItem } from '../../domain/academic-module';
import {
  AcademicModuleRepository,
  ActivateModuleCommand,
} from '../../domain/academic-module.repository';
import { AcademicModuleOrmEntity } from './academic-module.orm-entity';

const INSERT_CHUNK = 500;

@Injectable()
export class TypeormAcademicModuleRepository extends AcademicModuleRepository {
  constructor(
    @InjectRepository(AcademicModuleOrmEntity)
    private readonly repo: Repository<AcademicModuleOrmEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async findActive(): Promise<AcademicModule | null> {
    const row = await this.repo.findOneBy({ isActive: true });
    return row ? toDomain(row) : null;
  }

  async findById(id: number): Promise<AcademicModule | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toDomain(row) : null;
  }

  async findScheduled(): Promise<AcademicModule | null> {
    const row = await this.repo.findOneBy({ status: 'SCHEDULED' });
    return row ? toDomain(row) : null;
  }

  async list(today: string, timeZone: string): Promise<ModuleListItem[]> {
    // Clases "realizadas": anteriores a hoy, o hasta el día de cierre si el módulo ya terminó.
    const rows: ListRow[] = await this.dataSource.query(
      `
      WITH ref AS (
        SELECT m.id,
               CASE WHEN m.status = 'CLOSED' AND m.closed_at IS NOT NULL
                    THEN LEAST((m.closed_at AT TIME ZONE $2)::date + 1, $1::date)
                    ELSE $1::date END AS until
        FROM modules m
      )
      SELECT m.id,
             trim(concat_ws(' ', a.title, a.full_name)) AS teacher_name,
             (SELECT COUNT(*) FROM students s WHERE s.module_id = m.id)::int AS students,
             (SELECT COUNT(*) FROM class_sessions c WHERE c.module_id = m.id AND c.status = 'SCHEDULED')::int AS sessions,
             (SELECT MIN(c.class_date)::text FROM class_sessions c WHERE c.module_id = m.id AND c.status = 'SCHEDULED') AS first_date,
             (SELECT MAX(c.class_date)::text FROM class_sessions c WHERE c.module_id = m.id AND c.status = 'SCHEDULED') AS last_date,
             (SELECT COUNT(*) FROM class_sessions c WHERE c.module_id = m.id AND c.status = 'SCHEDULED' AND c.class_date < ref.until)::int AS held,
             (SELECT COUNT(*) FROM attendances t JOIN class_sessions c ON c.id = t.session_id
               WHERE t.module_id = m.id AND c.class_date < ref.until AND t.status IN ('PRESENTE', 'ATRASO'))::int AS attended,
             (SELECT COUNT(*) FROM attendances t JOIN class_sessions c ON c.id = t.session_id
               WHERE t.module_id = m.id AND c.class_date < ref.until AND t.status = 'JUSTIFICADO')::int AS justified
      FROM modules m
      JOIN ref ON ref.id = m.id
      LEFT JOIN admins a ON a.id = m.created_by
      `,
      [today, timeZone],
    );
    const modules = new Map((await this.repo.find()).map((row) => [row.id, toDomain(row)]));
    return rows
      .map((row) => {
        const module = modules.get(row.id)!;
        const evaluated = row.students * row.held - row.justified;
        return {
          ...module,
          studentCount: row.students,
          sessionCount: row.sessions,
          firstDate: row.first_date,
          lastDate: row.last_date,
          teacherName: row.teacher_name || null,
          attendancePercentage: evaluated > 0 ? Math.round((row.attended / evaluated) * 100) : null,
        };
      })
      .sort((a, b) => sortKey(b) - sortKey(a));
  }

  async updateExtraFields(moduleId: number, fields: ExtraField[]): Promise<AcademicModule> {
    await this.repo.update({ id: moduleId }, { extraFields: fields });
    return toDomain(await this.repo.findOneByOrFail({ id: moduleId }));
  }

  async updateRules(moduleId: number, rules: AttendanceRules): Promise<AcademicModule> {
    await this.repo.update({ id: moduleId }, toRuleColumns(rules));
    const row = await this.repo.findOneBy({ id: moduleId });
    if (!row) throw new NotFoundError('El módulo ya no existe');
    return toDomain(row);
  }

  async summarize(module: AcademicModule): Promise<AcademicModuleSummary> {
    const [studentCount, sessions] = await Promise.all([
      this.dataSource.getRepository(StudentOrmEntity).countBy({ moduleId: module.id }),
      this.dataSource
        .getRepository(ClassSessionOrmEntity)
        .createQueryBuilder('s')
        .select('COUNT(*)::int', 'count')
        .addSelect('MIN(s.class_date)::text', 'first')
        .addSelect('MAX(s.class_date)::text', 'last')
        .where('s.module_id = :id', { id: module.id })
        .andWhere("s.status = 'SCHEDULED'")
        .getRawOne<{ count: number; first: string | null; last: string | null }>(),
    ]);
    return {
      ...module,
      studentCount,
      sessionCount: sessions?.count ?? 0,
      firstDate: sessions?.first ?? null,
      lastDate: sessions?.last ?? null,
    };
  }

  async activateNew(command: ActivateModuleCommand): Promise<AcademicModule> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const scheduled = command.scheduledFor !== null;
        if (!scheduled) {
          // RN-08: el módulo anterior solo se desactiva; sus datos se conservan.
          await manager.update(
            AcademicModuleOrmEntity,
            { isActive: true },
            { isActive: false, status: 'CLOSED', closedAt: command.now },
          );
        }

        const module = await manager.save(
          manager.create(AcademicModuleOrmEntity, {
            name: command.name,
            status: scheduled ? 'SCHEDULED' : 'ACTIVE',
            isActive: !scheduled,
            activatedAt: scheduled ? null : command.now,
            scheduledFor: command.scheduledFor,
            closedAt: null,
            createdBy: command.createdBy,
            extraFields: command.extraFields,
            ...toRuleColumns(command.rules),
          }),
        );

        for (let i = 0; i < command.students.length; i += INSERT_CHUNK) {
          await manager.insert(
            StudentOrmEntity,
            command.students
              .slice(i, i + INSERT_CHUNK)
              .map((s) => ({ ...s, moduleId: module.id })),
          );
        }

        await manager.insert(
          ClassSessionOrmEntity,
          command.sessions.map((s) => ({
            moduleId: module.id,
            classDate: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
          })),
        );

        return toDomain(module);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          command.scheduledFor
            ? 'Ya hay un módulo programado. Cancélalo o actívalo antes de programar otro.'
            : 'Otro proceso activó un módulo al mismo tiempo. Recarga la página e inténtalo de nuevo.',
        );
      }
      throw error;
    }
  }

  async activateScheduled(moduleId: number, now: Date) {
    return this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(AcademicModuleOrmEntity, {
        where: { id: moduleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row || row.status !== 'SCHEDULED') return null;

      const previousRow = await manager.findOneBy(AcademicModuleOrmEntity, { isActive: true });
      if (previousRow) {
        await manager.update(
          AcademicModuleOrmEntity,
          { id: previousRow.id },
          { isActive: false, status: 'CLOSED', closedAt: now },
        );
      }
      await manager.update(
        AcademicModuleOrmEntity,
        { id: moduleId },
        { isActive: true, status: 'ACTIVE', activatedAt: now },
      );
      const module = await manager.findOneByOrFail(AcademicModuleOrmEntity, { id: moduleId });
      return {
        module: toDomain(module),
        previous: previousRow ? { ...toDomain(previousRow), isActive: false, status: 'CLOSED' as const, closedAt: now } : null,
      };
    });
  }

  async reschedule(moduleId: number, scheduledFor: Date): Promise<AcademicModule> {
    const result = await this.repo.update({ id: moduleId, status: 'SCHEDULED' }, { scheduledFor });
    if (!result.affected) throw new BusinessRuleError('El módulo ya no está programado');
    return toDomain(await this.repo.findOneByOrFail({ id: moduleId }));
  }

  async cancelScheduled(moduleId: number, now: Date): Promise<AcademicModule> {
    const result = await this.repo.update(
      { id: moduleId, status: 'SCHEDULED' },
      { status: 'CANCELLED', closedAt: now },
    );
    if (!result.affected) throw new BusinessRuleError('El módulo ya no está programado');
    return toDomain(await this.repo.findOneByOrFail({ id: moduleId }));
  }
}

function toDomain(row: AcademicModuleOrmEntity): AcademicModule {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    isActive: row.isActive,
    activatedAt: row.activatedAt,
    closedAt: row.closedAt,
    scheduledFor: row.scheduledFor,
    createdBy: row.createdBy,
    extraFields: row.extraFields ?? [],
    rules: {
      enabled: row.lateRulesEnabled,
      openBeforeMinutes: row.openBeforeMinutes,
      toleranceMinutes: row.toleranceMinutes,
      lateLimitMinutes: row.lateLimitMinutes,
      presentPoints: row.presentPoints,
      latePoints: row.latePoints,
      minAttendancePercentage: row.minAttendancePercentage,
      justificationDays: row.justificationDays,
      requireClassCode: row.requireClassCode,
      classHoursOnly: row.classHoursOnly,
    },
  };
}

function toRuleColumns(rules: AttendanceRules) {
  return {
    lateRulesEnabled: rules.enabled,
    openBeforeMinutes: rules.openBeforeMinutes,
    toleranceMinutes: rules.toleranceMinutes,
    lateLimitMinutes: rules.lateLimitMinutes,
    presentPoints: rules.presentPoints,
    latePoints: rules.latePoints,
    minAttendancePercentage: rules.minAttendancePercentage,
    justificationDays: rules.justificationDays,
    requireClassCode: rules.requireClassCode,
    classHoursOnly: rules.classHoursOnly,
  };
}

interface ListRow {
  id: number;
  teacher_name: string | null;
  students: number;
  sessions: number;
  first_date: string | null;
  last_date: string | null;
  held: number;
  attended: number;
  justified: number;
}

/** Orden del historial: programado primero, luego activo y los demás por fecha. */
function sortKey(module: AcademicModule): number {
  const priority = { SCHEDULED: 3, ACTIVE: 2, CLOSED: 1, CANCELLED: 0 }[module.status];
  const date = module.activatedAt ?? module.scheduledFor ?? new Date(0);
  return priority * 1e14 + date.getTime();
}
