import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { AttendanceSource, StoredAttendanceStatus } from '../../domain/attendance-status';

@Entity('attendances')
export class AttendanceOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id', type: 'int' })
  moduleId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @Column({ type: 'varchar', length: 12 })
  status: StoredAttendanceStatus;

  @Column({ type: 'varchar', length: 10 })
  source: AttendanceSource;

  @Column({ name: 'marked_at', type: 'timestamptz', nullable: true })
  markedAt: Date | null;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
