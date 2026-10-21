import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ConflictError } from '../../../../shared/domain/errors';
import { isUniqueViolation } from '../../../../shared/infrastructure/persistence-errors';
import type { ClassSession, SessionStatus } from '../../domain/class-session';
import type { NewSessionChange, SessionChange } from '../../domain/session-change';
import { SessionChangeFileOrmEntity, SessionChangeOrmEntity } from './session-change.orm-entity';
import { ClassSessionRepository, SessionData } from '../../domain/class-session.repository';
import { ClassSessionOrmEntity } from './class-session.orm-entity';

@Injectable()
export class TypeormClassSessionRepository extends ClassSessionRepository {
  constructor(
    @InjectRepository(ClassSessionOrmEntity)
    private readonly repo: Repository<ClassSessionOrmEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async findByModule(moduleId: number): Promise<ClassSession[]> {
    const rows = await this.repo.find({ where: { moduleId }, order: { classDate: 'ASC' } });
    return rows.map(toDomain);
  }

  async findByModuleAndDate(moduleId: number, date: string): Promise<ClassSession | null> {
    const row = await this.repo.findOneBy({ moduleId, classDate: date });
    return row ? toDomain(row) : null;
  }

  async findById(id: number): Promise<ClassSession | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toDomain(row) : null;
  }
  async countAttendances(sessionId: number): Promise<number> {
    const [row] = await this.dataSource.query<{ count: number }[]>(
      'SELECT COUNT(*)::int AS count FROM attendances WHERE session_id = $1',
      [sessionId],
    );
    return row.count;
  }

  async create(moduleId: number, data: SessionData, isMakeup: boolean): Promise<ClassSession> {
    try {
      const row = await this.repo.save(this.repo.create({ ...data, moduleId, isMakeup, status: 'SCHEDULED', classCode: null }));
      return toDomain(await this.repo.findOneByOrFail({ id: row.id }));
    } catch (error) {
      throw this.dateTaken(error);
    }
  }

  async update(id: number, data: SessionData): Promise<ClassSession> {
    try {
      await this.repo.update({ id }, data);
      return toDomain(await this.repo.findOneByOrFail({ id }));
    } catch (error) {
      throw this.dateTaken(error);
    }
  }

  async setStatus(id: number, status: SessionStatus): Promise<ClassSession> {
    await this.repo.update({ id }, { status });
    return toDomain(await this.repo.findOneByOrFail({ id }));
  }

  async setCode(id: number, code: string | null): Promise<ClassSession> {
    await this.repo.update({ id }, { classCode: code });
    return toDomain(await this.repo.findOneByOrFail({ id }));
  }

  async recordChange(change: NewSessionChange): Promise<SessionChange> {
    const id = await this.dataSource.transaction(async (manager) => {
      const row = await manager.save(
        manager.create(SessionChangeOrmEntity, {
          moduleId: change.moduleId,
          sessionId: change.sessionId,
          adminId: change.adminId,
          action: change.action,
          previous: change.previous,
          next: change.next,
          reason: change.reason,
          createdAt: change.now,
        }),
      );
      for (const file of change.files) {
        await manager.insert(SessionChangeFileOrmEntity, {
          changeId: row.id,
          mimeType: file.mimetype,
          size: file.size,
          data: file.buffer,
        });
      }
      return row.id;
    });
    return (await this.loadChanges({ id }))[0];
  }

  listChanges(moduleId: number): Promise<SessionChange[]> {
    return this.loadChanges({ moduleId });
  }

  async findChangeFile(changeId: number, fileId: number) {
    const file = await this.dataSource
      .getRepository(SessionChangeFileOrmEntity)
      .createQueryBuilder('f')
      .addSelect('f.data')
      .where('f.id = :fileId AND f.change_id = :changeId', { fileId, changeId })
      .getOne();
    const change = await this.dataSource.getRepository(SessionChangeOrmEntity).findOneBy({ id: changeId });
    return file && change ? { data: file.data, mimeType: file.mimeType, moduleId: change.moduleId } : null;
  }

  private async loadChanges(where: { id?: number; moduleId?: number }): Promise<SessionChange[]> {
    const rows = await this.dataSource
      .getRepository(SessionChangeOrmEntity)
      .find({ where, order: { createdAt: 'DESC', id: 'DESC' } });
    if (rows.length === 0) return [];
    const files = await this.dataSource
      .getRepository(SessionChangeFileOrmEntity)
      .find({ where: { changeId: In(rows.map((r) => r.id)) }, order: { id: 'ASC' } });
    const admins: { id: number; name: string }[] = await this.dataSource.query(
      `SELECT id, trim(concat_ws(' ', title, full_name)) AS name FROM admins WHERE id = ANY($1)`,
      [[...new Set(rows.map((r) => r.adminId).filter((v): v is number => v !== null))]],
    );
    const adminName = new Map(admins.map((a) => [a.id, a.name]));
    return rows.map((row) => ({
      id: row.id,
      moduleId: row.moduleId,
      sessionId: row.sessionId,
      adminId: row.adminId,
      adminName: row.adminId ? (adminName.get(row.adminId) ?? null) : null,
      action: row.action,
      previous: row.previous,
      next: row.next,
      reason: row.reason,
      createdAt: row.createdAt,
      files: files.filter((f) => f.changeId === row.id).map((f) => ({ id: f.id, mimeType: f.mimeType, size: f.size })),
    }));
  }

  private dateTaken(error: unknown) {
    return isUniqueViolation(error) ? new ConflictError('Ya hay una clase registrada en esa fecha') : error;
  }
}

/** PostgreSQL devuelve TIME como HH:mm:ss; el dominio usa HH:mm. */
function toDomain(row: ClassSessionOrmEntity): ClassSession {
  return {
    ...row,
    startTime: row.startTime.slice(0, 5),
    endTime: row.endTime.slice(0, 5),
  };
}
