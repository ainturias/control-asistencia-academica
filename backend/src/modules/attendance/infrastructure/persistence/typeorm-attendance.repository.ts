import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ConflictError } from '../../../../shared/domain/errors';
import { isUniqueViolation } from '../../../../shared/infrastructure/persistence-errors';
import type { Attendance } from '../../domain/attendance';
import {
  ApplyAdminChangeCommand,
  AttendanceRepository,
  RegisterStudentMarkCommand,
} from '../../domain/attendance.repository';
import { AttendanceChangeOrmEntity } from './attendance-change.orm-entity';
import { AttendanceOrmEntity } from './attendance.orm-entity';

@Injectable()
export class TypeormAttendanceRepository extends AttendanceRepository {
  constructor(
    @InjectRepository(AttendanceOrmEntity)
    private readonly repo: Repository<AttendanceOrmEntity>,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async findByModule(moduleId: number): Promise<Attendance[]> {
    return this.withNotes(await this.repo.findBy({ moduleId }));
  }

  async findByStudent(studentId: number): Promise<Attendance[]> {
    return this.withNotes(await this.repo.findBy({ studentId }));
  }

  async findOne(studentId: number, sessionId: number): Promise<Attendance | null> {
    const row = await this.repo.findOneBy({ studentId, sessionId });
    return row ? (await this.withNotes([row]))[0] : null;
  }

  /** Agrega el motivo del último cambio administrativo de cada registro. */
  private async withNotes(rows: AttendanceOrmEntity[]): Promise<Attendance[]> {
    const edited = rows.filter((r) => r.source === 'ADMIN').map((r) => r.id);
    const notes = new Map<number, string | null>();
    if (edited.length > 0) {
      const changes = await this.dataSource.getRepository(AttendanceChangeOrmEntity).find({
        where: { attendanceId: In(edited) },
        order: { changedAt: 'DESC', id: 'DESC' },
      });
      for (const change of changes) {
        if (!notes.has(change.attendanceId)) notes.set(change.attendanceId, change.reason);
      }
    }
    return rows.map((row) => toDomain(row, notes.get(row.id) ?? null));
  }

  async registerStudentMark(command: RegisterStudentMarkCommand): Promise<Attendance> {
    try {
      const row = await this.repo.save(
        this.repo.create({
          ...command,
          source: 'STUDENT',
          updatedAt: command.markedAt,
        }),
      );
      return toDomain(row, null);
    } catch (error) {
      // RN-03 garantizado por UNIQUE(student_id, session_id), incluso con doble clic.
      if (isUniqueViolation(error)) {
        throw new ConflictError('Ya registraste tu asistencia de hoy');
      }
      throw error;
    }
  }

  async applyAdminChange(command: ApplyAdminChangeCommand): Promise<Attendance> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const existing = await manager.findOne(AttendanceOrmEntity, {
          where: { studentId: command.studentId, sessionId: command.sessionId },
          lock: { mode: 'pessimistic_write' },
        });

        const attendance = await manager.save(
          existing
            ? manager.merge(AttendanceOrmEntity, existing, {
                status: command.newStatus,
                source: 'ADMIN',
                updatedAt: command.now,
              })
            : manager.create(AttendanceOrmEntity, {
                moduleId: command.moduleId,
                studentId: command.studentId,
                sessionId: command.sessionId,
                status: command.newStatus,
                source: 'ADMIN',
                markedAt: null,
                updatedAt: command.now,
              }),
        );

        await manager.insert(AttendanceChangeOrmEntity, {
          attendanceId: attendance.id,
          adminId: command.adminId,
          oldStatus: command.previousStatus,
          newStatus: command.newStatus,
          reason: command.reason,
          changedAt: command.now,
        });

        return toDomain(attendance, command.reason);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError(
          'La asistencia cambió mientras la editabas. Recarga e inténtalo de nuevo.',
        );
      }
      throw error;
    }
  }
}

function toDomain(row: AttendanceOrmEntity, adminNote: string | null): Attendance {
  return {
    id: row.id,
    moduleId: row.moduleId,
    studentId: row.studentId,
    sessionId: row.sessionId,
    status: row.status,
    source: row.source,
    markedAt: row.markedAt,
    updatedAt: row.updatedAt,
    adminNote,
  };
}
