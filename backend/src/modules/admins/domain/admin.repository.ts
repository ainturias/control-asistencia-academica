import type { Admin } from './admin';
import type { AdminPhoto, AdminProfile, AdminProfileChanges } from './admin-profile';

export abstract class AdminRepository {
  abstract findByEmail(email: string): Promise<Admin | null>;
  abstract findById(id: number): Promise<Admin | null>;
  abstract updatePasswordHash(id: number, passwordHash: string): Promise<void>;
  abstract create(data: Omit<Admin, 'id'>): Promise<Admin>;
  abstract findProfile(id: number): Promise<AdminProfile | null>;
  abstract updateProfile(id: number, changes: AdminProfileChanges): Promise<void>;
  abstract findPhoto(id: number): Promise<AdminPhoto | null>;
  /** null elimina la foto. */
  abstract setPhoto(id: number, photo: AdminPhoto | null): Promise<void>;
}
