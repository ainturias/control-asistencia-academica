import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('attendance_changes')
export class AttendanceChangeOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attendance_id', type: 'int' })
  attendanceId: number;

  @Column({ name: 'admin_id', type: 'int' })
  adminId: number;

  @Column({ name: 'old_status', type: 'varchar', length: 12 })
  oldStatus: string;

  @Column({ name: 'new_status', type: 'varchar', length: 12 })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;
}
