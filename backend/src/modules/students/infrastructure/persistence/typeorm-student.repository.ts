import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Student } from '../../domain/student';
import { StudentData, StudentRepository } from '../../domain/student.repository';
import { StudentOrmEntity } from './student.orm-entity';

/** Minúsculas y sin acentos, para que "maria" encuentre "María". */
const fold = (sql: string) => `translate(lower(${sql}), 'áéíóúüñ', 'aeiouun')`;

@Injectable()
export class TypeormStudentRepository extends StudentRepository {
  constructor(
    @InjectRepository(StudentOrmEntity)
    private readonly repo: Repository<StudentOrmEntity>,
  ) {
    super();
  }

  findByIdentifier(moduleId: number, identifier: string): Promise<Student | null> {
    const value = identifier.trim();
    return this.repo
      .createQueryBuilder('s')
      .where('s.module_id = :moduleId', { moduleId })
      .andWhere('s.active')
      .andWhere('(lower(s.email) = lower(:value) OR s.registration_number = :value)', { value })
      .getOne();
  }

  findById(id: number): Promise<Student | null> {
    return this.repo.findOneBy({ id });
  }

  findByModule(moduleId: number, search?: string, includeInactive = false): Promise<Student[]> {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.module_id = :moduleId', { moduleId });
    if (!includeInactive) qb.andWhere('s.active');
    if (search) {
      qb.andWhere(
        `(${fold('s.full_name')} LIKE ${fold(':term')} OR s.registration_number ILIKE :term)`,
        { term: `%${search.replace(/[%_\\]/g, '\\$&')}%` },
      );
    }
    return qb.orderBy('s.full_name', 'ASC').getMany();
  }

  findConflict(moduleId: number, registrationNumber: string, email: string, excludeId?: number) {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.module_id = :moduleId', { moduleId })
      .andWhere('(s.registration_number = :registrationNumber OR lower(s.email) = lower(:email))', {
        registrationNumber,
        email,
      });
    if (excludeId) qb.andWhere('s.id <> :excludeId', { excludeId });
    return qb.getOne();
  }

  create(moduleId: number, data: StudentData): Promise<Student> {
    return this.repo.save(this.repo.create({ ...data, moduleId, active: true }));
  }

  async update(id: number, data: StudentData): Promise<Student> {
    await this.repo.update({ id }, data);
    return this.repo.findOneByOrFail({ id });
  }

  async setActive(id: number, active: boolean): Promise<Student> {
    await this.repo.update({ id }, { active });
    return this.repo.findOneByOrFail({ id });
  }
}
