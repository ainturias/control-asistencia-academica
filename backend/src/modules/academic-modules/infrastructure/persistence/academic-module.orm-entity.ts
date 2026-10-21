import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { ExtraField } from '../../../../shared/domain/extra-fields';
import type { ModuleStatus } from '../../domain/academic-module';

@Entity('modules')
export class AcademicModuleOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive: boolean;

  @Column({ name: 'extra_fields', type: 'jsonb', default: () => "'[]'" })
  extraFields: ExtraField[];

  @Column({ type: 'varchar', length: 12, default: 'CLOSED' })
  status: ModuleStatus;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'late_rules_enabled', type: 'boolean', default: false })
  lateRulesEnabled: boolean;

  @Column({ name: 'open_before_minutes', type: 'int', default: 15 })
  openBeforeMinutes: number;

  @Column({ name: 'tolerance_minutes', type: 'int', default: 20 })
  toleranceMinutes: number;

  @Column({ name: 'late_limit_minutes', type: 'int', default: 60 })
  lateLimitMinutes: number;

  @Column({ name: 'present_points', type: 'int', default: 2 })
  presentPoints: number;

  @Column({ name: 'late_points', type: 'int', default: 1 })
  latePoints: number;

  @Column({ name: 'min_attendance_percentage', type: 'int', default: 80 })
  minAttendancePercentage: number;

  @Column({ name: 'justification_days', type: 'int', default: 3 })
  justificationDays: number;

  @Column({ name: 'require_class_code', type: 'boolean', default: false })
  requireClassCode: boolean;

  @Column({ name: 'class_hours_only', type: 'boolean', default: false })
  classHoursOnly: boolean;
}
