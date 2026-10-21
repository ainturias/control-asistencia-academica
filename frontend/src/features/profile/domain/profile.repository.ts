import type { ProfileChanges, TeacherProfile } from './profile'

export interface ProfileRepository {
  get(): Promise<TeacherProfile>
  update(changes: ProfileChanges): Promise<TeacherProfile>
  getPhoto(): Promise<Blob>
  uploadPhoto(file: File): Promise<TeacherProfile>
  removePhoto(): Promise<TeacherProfile>
  changePassword(currentPassword: string, newPassword: string): Promise<void>
  /** Docente del módulo activo; lo pueden ver estudiantes y administradores. */
  getTeacher(moduleId?: number): Promise<TeacherProfile | null>
  getTeacherPhoto(moduleId?: number): Promise<Blob>
}
