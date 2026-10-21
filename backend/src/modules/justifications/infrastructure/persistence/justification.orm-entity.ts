import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { StoredAttendanceStatus } from '../../../attendance/domain/attendance-status';
import type { JustificationOrigin, JustificationStatus } from '../../domain/justification';

@Entity('justifications')
export class JustificationOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id', type: 'int' })
  moduleId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @Column({ type: 'varchar', length: 10 })
  origin: JustificationOrigin;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 10 })
  status: JustificationStatus;

  @Column({ name: 'resolved_status', type: 'varchar', length: 12, nullable: true })
  resolvedStatus: StoredAttendanceStatus | null;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment: string | null;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

@Entity('justification_files')
export class JustificationFileOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'justification_id', type: 'int' })
  justificationId: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 40 })
  mimeType: string;

  @Column({ type: 'int' })
  size: number;

  /** Las imágenes solo se cargan cuando se piden una por una. */
  @Column({ type: 'bytea', select: false })
  data: Buffer;
}
