import { Injectable } from '@nestjs/common';
import { RealtimeEvents } from '../../../shared/application/realtime.port';
import { BusinessRuleError, NotFoundError } from '../../../shared/domain/errors';
import type { AdminProfile, AdminProfileChanges } from '../domain/admin-profile';
import { AdminRepository } from '../domain/admin.repository';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Perfil del administrador, que figura como docente del módulo. */
@Injectable()
export class AdminProfileService {
  constructor(
    private readonly admins: AdminRepository,
    private readonly realtime: RealtimeEvents,
  ) {}

  async get(adminId: number): Promise<AdminProfile> {
    const profile = await this.admins.findProfile(adminId);
    if (!profile) throw new NotFoundError('El administrador ya no existe');
    return profile;
  }

  async update(adminId: number, changes: AdminProfileChanges): Promise<AdminProfile> {
    const clean = (value: string | null) => value?.trim() || null;
    const fullName = changes.fullName.trim();
    if (!fullName) throw new BusinessRuleError('El nombre completo es obligatorio');
    await this.admins.updateProfile(adminId, {
      fullName,
      title: clean(changes.title),
      phone: clean(changes.phone),
      specialty: clean(changes.specialty),
      bio: clean(changes.bio),
    });
    // El docente aparece en el calendario y el panel de los estudiantes.
    this.realtime.toEveryone({ action: 'UPDATE_PROFILE' });
    return this.get(adminId);
  }

  async getPhoto(adminId: number) {
    const photo = await this.admins.findPhoto(adminId);
    if (!photo) throw new NotFoundError('El docente no tiene foto');
    return photo;
  }

  async setPhoto(adminId: number, file: { buffer: Buffer; mimetype: string } | undefined): Promise<AdminProfile> {
    if (!file) throw new BusinessRuleError('Selecciona una imagen');
    if (!PHOTO_TYPES.includes(file.mimetype)) {
      throw new BusinessRuleError('La foto debe ser una imagen JPG, PNG o WEBP');
    }
    if (file.buffer.length > MAX_PHOTO_BYTES) {
      throw new BusinessRuleError('La foto no puede pesar más de 2 MB');
    }
    await this.admins.setPhoto(adminId, { data: file.buffer, mimeType: file.mimetype });
    this.realtime.toEveryone({ action: 'UPDATE_PROFILE_PHOTO', images: true });
    return this.get(adminId);
  }

  async removePhoto(adminId: number): Promise<AdminProfile> {
    await this.admins.setPhoto(adminId, null);
    this.realtime.toEveryone({ action: 'UPDATE_PROFILE_PHOTO', images: true });
    return this.get(adminId);
  }
}
