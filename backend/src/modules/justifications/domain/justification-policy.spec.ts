import { BusinessRuleError, ConflictError, ValidationError } from '../../../shared/domain/errors';
import type { Justification } from './justification';
import { ensureStudentCanJustify, ensureValidImages, ensureValidReason } from './justification-policy';

const justification = (status: Justification['status']): Justification => ({
  id: 1,
  moduleId: 1,
  studentId: 1,
  sessionId: 1,
  origin: 'STUDENT',
  reason: 'Se cortó la luz',
  status,
  resolvedStatus: null,
  reviewComment: null,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date(),
  files: [],
});

const image = (overrides: Partial<{ mimetype: string; size: number }> = {}) => ({
  buffer: Buffer.from('x'),
  mimetype: 'image/jpeg',
  size: 1000,
  ...overrides,
});

describe('ensureStudentCanJustify', () => {
  const base = { status: 'FALTA' as const, classDate: '2026-10-12', today: '2026-10-14', existing: [], windowDays: 3 };

  it('permite justificar una falta o un atraso dentro de los 3 días', () => {
    expect(() => ensureStudentCanJustify(base)).not.toThrow();
    expect(() => ensureStudentCanJustify({ ...base, status: 'ATRASO', classDate: '2026-10-11' })).not.toThrow();
  });

  it('rechaza otros estados, clases futuras y fuera de plazo', () => {
    expect(() => ensureStudentCanJustify({ ...base, status: 'PRESENTE' })).toThrow(BusinessRuleError);
    expect(() => ensureStudentCanJustify({ ...base, classDate: '2026-10-15' })).toThrow(BusinessRuleError);
    expect(() => ensureStudentCanJustify({ ...base, classDate: '2026-10-10' })).toThrow(BusinessRuleError);
  });

  it('usa el plazo configurado del módulo; 0 desactiva las justificaciones del estudiante', () => {
    expect(() => ensureStudentCanJustify({ ...base, classDate: '2026-10-05', windowDays: 10 })).not.toThrow();
    expect(() => ensureStudentCanJustify({ ...base, classDate: '2026-10-13', windowDays: 0 })).toThrow(BusinessRuleError);
  });

  it('no permite otra solicitud si hay una pendiente o aprobada, pero sí tras un rechazo', () => {
    expect(() => ensureStudentCanJustify({ ...base, existing: [justification('PENDING')] })).toThrow(ConflictError);
    expect(() => ensureStudentCanJustify({ ...base, existing: [justification('APPROVED')] })).toThrow(ConflictError);
    expect(() => ensureStudentCanJustify({ ...base, existing: [justification('REJECTED')] })).not.toThrow();
  });
});

describe('validaciones de la justificación', () => {
  it('exige un motivo y limpia espacios', () => {
    expect(ensureValidReason('  Se   cortó la luz ')).toBe('Se cortó la luz');
    expect(() => ensureValidReason('ok')).toThrow(ValidationError);
  });

  it('acepta de 1 a 4 imágenes JPG, PNG o WEBP de hasta 3 MB', () => {
    expect(() => ensureValidImages([image()], 1)).not.toThrow();
    expect(() => ensureValidImages([], 1)).toThrow(ValidationError);
    expect(() => ensureValidImages([image(), image(), image(), image(), image()], 1)).toThrow(ValidationError);
    expect(() => ensureValidImages([image({ mimetype: 'application/pdf' })], 1)).toThrow(ValidationError);
    expect(() => ensureValidImages([image({ size: 4 * 1024 * 1024 })], 1)).toThrow(ValidationError);
  });
});
