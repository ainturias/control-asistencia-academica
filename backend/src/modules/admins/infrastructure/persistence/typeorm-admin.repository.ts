import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Admin } from '../../domain/admin';
import type { AdminPhoto, AdminProfile, AdminProfileChanges } from '../../domain/admin-profile';
import { AdminRepository } from '../../domain/admin.repository';
import { AdminOrmEntity } from './admin.orm-entity';

@Injectable()
export class TypeormAdminRepository extends AdminRepository {
  constructor(
    @InjectRepository(AdminOrmEntity)
    private readonly repo: Repository<AdminOrmEntity>,
  ) {
    super();
  }

  findByEmail(email: string): Promise<Admin | null> {
    return this.repo
      .createQueryBuilder('a')
      .where('lower(a.email) = lower(:email)', { email: email.trim() })
      .getOne();
  }

  async updatePasswordHash(id: number, passwordHash: string): Promise<void> {
    await this.repo.update({ id }, { passwordHash });
  }

  findById(id: number): Promise<Admin | null> {
    return this.repo.findOneBy({ id });
  }

  create(data: Omit<Admin, 'id'>): Promise<Admin> {
    return this.repo.save(this.repo.create(data));
  }

  async findProfile(id: number): Promise<AdminProfile | null> {
    const row = await this.repo.findOneBy({ id });
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      fullName: row.fullName,
      title: row.title,
      phone: row.phone,
      specialty: row.specialty,
      bio: row.bio,
      hasPhoto: row.photoMime !== null,
    };
  }

  async updateProfile(id: number, changes: AdminProfileChanges): Promise<void> {
    await this.repo.update({ id }, changes);
  }

  async findPhoto(id: number): Promise<AdminPhoto | null> {
    const row = await this.repo
      .createQueryBuilder('a')
      .addSelect('a.photo')
      .where('a.id = :id', { id })
      .getOne();
    return row?.photo && row.photoMime ? { data: row.photo, mimeType: row.photoMime } : null;
  }

  async setPhoto(id: number, photo: AdminPhoto | null): Promise<void> {
    await this.repo.update({ id }, { photo: photo?.data ?? null, photoMime: photo?.mimeType ?? null });
  }
}
