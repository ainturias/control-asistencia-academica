/** Datos públicos del administrador como docente del módulo. */
export interface AdminProfile {
  id: number;
  email: string;
  fullName: string;
  /** Grado académico, p. ej. "MSc." o "Ing." */
  title: string | null;
  phone: string | null;
  specialty: string | null;
  bio: string | null;
  hasPhoto: boolean;
}

export type AdminProfileChanges = Pick<AdminProfile, 'fullName' | 'title' | 'phone' | 'specialty' | 'bio'>;

export interface AdminPhoto {
  data: Buffer;
  mimeType: string;
}
