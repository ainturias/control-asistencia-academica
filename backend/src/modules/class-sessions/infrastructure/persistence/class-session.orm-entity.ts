import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { SessionStatus } from '../../domain/class-session';

@Entity('class_sessions')
export class ClassSessionOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id', type: 'int' })
  moduleId: number;

  /** DATE de PostgreSQL; TypeORM lo devuelve como 'YYYY-MM-DD'. */
  @Column({ name: 'class_date', type: 'date' })
  classDate: string;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ type: 'varchar', length: 12, default: 'SCHEDULED' })
  status: SessionStatus;

  @Column({ name: 'is_makeup', type: 'boolean', default: false })
  isMakeup: boolean;

  @Column({ name: 'class_code', type: 'varchar', length: 12, nullable: true })
  classCode: string | null;
}
