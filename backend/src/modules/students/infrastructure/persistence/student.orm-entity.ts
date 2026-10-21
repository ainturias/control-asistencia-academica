import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('students')
export class StudentOrmEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'module_id', type: 'int' })
  moduleId: number;

  @Column({ name: 'registration_number', type: 'varchar', length: 30 })
  registrationNumber: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName: string;

  @Column({ type: 'varchar', length: 150 })
  email: string;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  extra: Record<string, string>;

  @Column({ type: 'boolean', default: true })
  active: boolean;
}
