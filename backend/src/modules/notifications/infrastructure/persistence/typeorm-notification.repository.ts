import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { Role } from '../../../../shared/domain/auth-user';
import type { NewNotification, Notification } from '../../domain/notification';
import { FeedQuery, NotificationRepository } from '../../domain/notification.repository';
import { NotificationOrmEntity, NotificationSeenOrmEntity } from './notification.orm-entity';

@Injectable()
export class TypeormNotificationRepository extends NotificationRepository {
  constructor(
    @InjectRepository(NotificationOrmEntity)
    private readonly repo: Repository<NotificationOrmEntity>,
    @InjectRepository(NotificationSeenOrmEntity)
    private readonly seen: Repository<NotificationSeenOrmEntity>,
  ) {
    super();
  }

  async create(notification: NewNotification, now: Date): Promise<void> {
    await this.repo.insert({ ...notification, createdAt: now });
  }

  async feed(query: FeedQuery): Promise<Notification[]> {
    const rows = await this.scoped(query).orderBy('n.created_at', 'DESC').addOrderBy('n.id', 'DESC').limit(query.limit).getMany();
    return rows.map((row) => ({
      id: row.id,
      moduleId: row.moduleId,
      audience: row.audience,
      studentId: row.studentId,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      createdAt: row.createdAt,
    }));
  }

  countSince(query: Omit<FeedQuery, 'limit'>, since: Date | null): Promise<number> {
    const qb = this.scoped(query);
    if (since) qb.andWhere('n.created_at > :since', { since });
    return qb.getCount();
  }

  async lastSeen(role: Role, userId: number, moduleId: number): Promise<Date | null> {
    const row = await this.seen.findOneBy({ userRole: role, userId, moduleId });
    return row?.lastSeenAt ?? null;
  }

  async markSeen(role: Role, userId: number, moduleId: number, at: Date): Promise<void> {
    await this.seen.upsert({ userRole: role, userId, moduleId, lastSeenAt: at }, ['userRole', 'userId', 'moduleId']);
  }

  /** Notificaciones del módulo para esa audiencia; las de un estudiante incluyen las generales y las suyas. */
  private scoped(query: Omit<FeedQuery, 'limit'>): SelectQueryBuilder<NotificationOrmEntity> {
    const qb = this.repo
      .createQueryBuilder('n')
      .where('n.module_id = :moduleId AND n.audience = :audience', { moduleId: query.moduleId, audience: query.audience });
    if (query.audience === 'STUDENT') {
      qb.andWhere('(n.student_id IS NULL OR n.student_id = :studentId)', { studentId: query.studentId ?? 0 });
    }
    return qb;
  }
}
