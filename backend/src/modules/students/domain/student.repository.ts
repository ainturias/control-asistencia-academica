import type { Student } from './student';

export type StudentData = Pick<Student, 'registrationNumber' | 'fullName' | 'email' | 'extra'>;

export abstract class StudentRepository {
  /** RF-01: busca un estudiante activo por correo (sin distinguir mayúsculas) o número de registro. */
  abstract findByIdentifier(moduleId: number, identifier: string): Promise<Student | null>;
  abstract findById(id: number): Promise<Student | null>;
  /** Por defecto solo los activos; los dados de baja no figuran en asistencias. */
  abstract findByModule(moduleId: number, search?: string, includeInactive?: boolean): Promise<Student[]>;
  /** RN-02: otro estudiante del módulo con ese registro o correo (incluye los dados de baja). */
  abstract findConflict(
    moduleId: number,
    registrationNumber: string,
    email: string,
    excludeId?: number,
  ): Promise<Student | null>;
  abstract create(moduleId: number, data: StudentData): Promise<Student>;
  abstract update(id: number, data: StudentData): Promise<Student>;
  abstract setActive(id: number, active: boolean): Promise<Student>;
}
