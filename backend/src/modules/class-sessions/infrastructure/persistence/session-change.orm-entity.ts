import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { SessionChangeAction, SessionSnapshot } from '../../domain/session-change';

@Entity('session_changes')
export class SessionChangeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id', type: 'int' })
  moduleId: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @Column({ name: 'admin_id', type: 'int', nullable: true })
  adminId: number | null;

  @Column({ type: 'varchar', length: 12 })
  action: SessionChangeAction;

  @Column({ type: 'jsonb', nullable: true })
  previous: SessionSnapshot | null;

  @Column({ type: 'jsonb', nullable: true })
  next: SessionSnapshot | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('session_change_files')
export class SessionChangeFileOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'change_id', type: 'int' })
  changeId: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 40 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  @Column({ type: 'bytea', select: false })
  data: Buffer;
}
