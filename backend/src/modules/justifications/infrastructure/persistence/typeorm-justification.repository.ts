import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ConflictError } from '../../../../shared/domain/errors';
import { isUniqueViolation } from '../../../../shared/infrastructure/persistence-errors';
import type { Justification } from '../../domain/justification';
import {
  CreateJustificationCommand,
  JustificationFilters,
  JustificationRepository,
  ResolveJustificationCommand,
} from '../../domain/justification.repository';
import { JustificationFileOrmEntity, JustificationOrmEntity } from './justification.orm-entity';

@Injectable()
export class TypeormJustificationRepository extends JustificationRepository {
  constructor(
    @InjectRepository(JustificationOrmEntity)
    private readonly repo: Repository<JustificationOrmEntity>,
    @InjectRepository(JustificationFileOrmEntity)
    private readonly files: Repository<JustificationFileOrmEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async create(command: CreateJustificationCommand): Promise<Justification> {
    try {
      const id = await this.dataSource.transaction(async (manager) => {
        const row = await manager.save(
          manager.create(JustificationOrmEntity, {
            moduleId: command.moduleId,
            studentId: command.studentId,
            sessionId: command.sessionId,
            origin: command.origin,
            reason: command.reason,
            status: command.status,
            resolvedStatus: command.resolvedStatus,
            reviewedBy: command.reviewedBy,
            reviewedAt: command.status === 'PENDING' ? null : command.now,
            reviewComment: null,
            createdAt: command.now,
          }),
        );
        for (const file of command.files) {
          await manager.insert(JustificationFileOrmEntity, {
            justificationId: row.id,
            mimeType: file.mimetype,
            size: file.size,
            data: file.buffer,
          });
        }
        return row.id;
      });
      return (await this.findById(id))!;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('Ya hay una justificación en revisión para esta clase');
      }
      throw error;
    }
  }

  async findById(id: number): Promise<Justification | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? (await this.withFiles([row]))[0] : null;
  }

  async list(filters: JustificationFilters): Promise<Justification[]> {
    // Solo se filtra por lo que se indicó (TypeORM no acepta valores undefined en el where).
    const rows = await this.repo.find({
      where: {
        moduleId: filters.moduleId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.studentId ? { studentId: filters.studentId } : {}),
      },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return this.withFiles(rows);
  }

  async findForSession(studentId: number, sessionId: number): Promise<Justification[]> {
    return this.withFiles(await this.repo.find({ where: { studentId, sessionId }, order: { createdAt: 'DESC' } }));
  }

  countPending(moduleId: number): Promise<number> {
    return this.repo.countBy({ moduleId, status: 'PENDING' });
  }

  async resolve(id: number, command: ResolveJustificationCommand): Promise<Justification | null> {
    const result = await this.repo.update(
      { id, status: 'PENDING' },
      {
        status: command.status,
        resolvedStatus: command.resolvedStatus,
        reviewComment: command.comment,
        reviewedBy: command.adminId,
        reviewedAt: command.now,
      },
    );
    return result.affected ? this.findById(id) : null;
  }

  async findFile(justificationId: number, fileId: number) {
    const row = await this.files
      .createQueryBuilder('f')
      .addSelect('f.data')
      .where('f.id = :fileId AND f.justification_id = :justificationId', { fileId, justificationId })
      .getOne();
    return row ? { data: row.data, mimeType: row.mimeType } : null;
  }

  private async withFiles(rows: JustificationOrmEntity[]): Promise<Justification[]> {
    if (rows.length === 0) return [];
    const files = await this.files.find({
      where: { justificationId: In(rows.map((r) => r.id)) },
      order: { id: 'ASC' },
    });
    return rows.map((row) => ({
      ...toPlain(row),
      files: files
        .filter((f) => f.justificationId === row.id)
        .map((f) => ({ id: f.id, mimeType: f.mimeType, size: f.size })),
    }));
  }
}

function toPlain(row: JustificationOrmEntity): Omit<Justification, 'files'> {
  return {
    id: row.id,
    moduleId: row.moduleId,
    studentId: row.studentId,
    sessionId: row.sessionId,
    origin: row.origin,
    reason: row.reason,
    status: row.status,
    resolvedStatus: row.resolvedStatus,
    reviewComment: row.reviewComment,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
  };
}
