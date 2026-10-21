import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLogOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id', type: 'int', nullable: true })
  moduleId: number | null;

  @Column({ name: 'actor_type', type: 'varchar', length: 10 })
  actorType: string;

  @Column({ name: 'actor_id', type: 'int' })
  actorId: number;

  @Column({ name: 'actor_name', type: 'varchar', length: 150 })
  actorName: string;

  @Column({ type: 'varchar', length: 40 })
  action: string;

  /** Estudiante afectado, para filtrar el historial (RF-10). */
  @Column({ name: 'student_id', type: 'int', nullable: true })
  studentId: number | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  entity: string | null;

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId: number | null;

  @Column({ type: 'varchar', length: 300 })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
