import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Role } from '../../../../shared/domain/auth-user';
import type {
  ActivityAction,
  ActivityLog,
  ActivitySearchCriteria,
  NewActivityLog,
} from '../../domain/activity-log';
import { ActivityLogRepository } from '../../domain/activity-log.repository';
import { ActivityLogOrmEntity } from './activity-log.orm-entity';

@Injectable()
export class TypeormActivityLogRepository extends ActivityLogRepository {
  constructor(
    @InjectRepository(ActivityLogOrmEntity)
    private readonly repo: Repository<ActivityLogOrmEntity>,
  ) {
    super();
  }

  async save(log: NewActivityLog): Promise<void> {
    await this.repo.save(this.repo.create(log));
  }

  async search(criteria: ActivitySearchCriteria) {
    const qb = this.repo
      .createQueryBuilder('a')
      .where('a.module_id = :moduleId', { moduleId: criteria.moduleId });

    if (criteria.studentId) {
      qb.andWhere('a.student_id = :studentId', { studentId: criteria.studentId });
    }
    if (criteria.date) {
      qb.andWhere('CAST(a.created_at AT TIME ZONE :tz AS date) = :day', {
        tz: criteria.timeZone,
        day: criteria.date,
      });
    }

    const [rows, total] = await qb
      .orderBy('a.created_at', 'DESC')
      .addOrderBy('a.id', 'DESC')
      .skip((criteria.page - 1) * criteria.pageSize)
      .take(criteria.pageSize)
      .getManyAndCount();

    return { items: rows.map(toDomain), total };
  }
}

function toDomain(row: ActivityLogOrmEntity): ActivityLog {
  return {
    ...row,
    actorType: row.actorType as Role,
    action: row.action as ActivityAction,
  };
}
