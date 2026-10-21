import { BusinessRuleError, ConflictError, ValidationError } from '../../../shared/domain/errors';
import type { AttendanceDisplayStatus } from '../../attendance/domain/attendance-status';
import type { Justification, UploadedImage } from './justification';

export const MAX_JUSTIFICATION_FILES = 4;
export const MAX_JUSTIFICATION_FILE_BYTES = 3 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** Solo se justifica una Falta o un Atraso de una clase que ya ocurrió, dentro del plazo y sin otra solicitud abierta. */
export function ensureStudentCanJustify(input: {
  status: AttendanceDisplayStatus;
  classDate: string;
  today: string;
  existing: Justification[];
  /** Plazo del módulo; 0 = los estudiantes no pueden justificar. */
  windowDays: number;
}): void {
  if (input.windowDays <= 0) {
    throw new BusinessRuleError('En este módulo las justificaciones las registra solo el docente. Consulta con él.');
  }
  if (input.status !== 'FALTA' && input.status !== 'ATRASO') {
    throw new BusinessRuleError('Solo puedes justificar una falta o un atraso');
  }
  const days = daysBetween(input.classDate, input.today);
  if (days < 0) throw new BusinessRuleError('No puedes justificar una clase que todavía no ocurrió');
  if (days > input.windowDays) {
    throw new BusinessRuleError(
      `El plazo para justificar es de ${input.windowDays} ${input.windowDays === 1 ? 'día' : 'días'} después de la clase. Consulta con tu docente.`,
    );
  }
  if (input.existing.some((j) => j.status === 'PENDING')) {
    throw new ConflictError('Ya enviaste una justificación para esta clase; está en revisión');
  }
  if (input.existing.some((j) => j.status === 'APPROVED')) {
    throw new ConflictError('Esta clase ya tiene una justificación aprobada');
  }
}

export function ensureValidReason(reason: string): string {
  const clean = reason.replace(/\s+/g, ' ').trim();
  if (clean.length < 5) throw new ValidationError('Explica el motivo (al menos 5 caracteres)');
  if (clean.length > 1000) throw new ValidationError('El motivo puede tener hasta 1000 caracteres');
  return clean;
}

export function ensureValidImages(files: UploadedImage[], minimum: number, maximum = MAX_JUSTIFICATION_FILES): void {
  if (files.length < minimum) {
    throw new ValidationError(`Adjunta al menos ${minimum} imagen${minimum === 1 ? '' : 'es'} como prueba`);
  }
  if (files.length > maximum) {
    throw new ValidationError(`Puedes adjuntar hasta ${maximum} imágenes`);
  }
  for (const file of files) {
    if (!IMAGE_TYPES.includes(file.mimetype)) {
      throw new ValidationError('Las pruebas deben ser imágenes JPG, PNG o WEBP');
    }
    if (file.size > MAX_JUSTIFICATION_FILE_BYTES) {
      throw new ValidationError('Cada imagen puede pesar hasta 3 MB');
    }
  }
}
