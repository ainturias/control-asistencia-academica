import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import type { Role } from '../../../../shared/domain/auth-user';
import type { NotificationType } from '../../domain/notification';

@Entity('notifications')
export class NotificationOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id', type: 'int' })
  moduleId: number;

  @Column({ type: 'varchar', length: 10 })
  audience: Role;

  @Column({ name: 'student_id', type: 'int', nullable: true })
  studentId: number | null;

  @Column({ type: 'varchar', length: 40 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  link: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('notification_seen')
export class NotificationSeenOrmEntity {
  @PrimaryColumn({ name: 'user_role', type: 'varchar', length: 10 })
  userRole: Role;

  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @PrimaryColumn({ name: 'module_id', type: 'int' })
  moduleId: number;

  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;
}
