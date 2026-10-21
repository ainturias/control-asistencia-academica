import { BusinessRuleError, ValidationError } from '../../../shared/domain/errors';
import { ensureValidSessionData, normalizeClassCode } from './session-management.service';

describe('ensureValidSessionData', () => {
  const today = '2026-10-14';
  it('acepta una fecha desde hoy con horario válido', () => {
    expect(() => ensureValidSessionData({ classDate: '2026-10-14', startTime: '18:00', endTime: '21:00' }, today)).not.toThrow();
  });
  it('rechaza fechas pasadas, inválidas y horarios al revés', () => {
    expect(() => ensureValidSessionData({ classDate: '2026-10-13', startTime: '18:00', endTime: '21:00' }, today)).toThrow(BusinessRuleError);
    expect(() => ensureValidSessionData({ classDate: '2026-02-30', startTime: '18:00', endTime: '21:00' }, today)).toThrow(ValidationError);
    expect(() => ensureValidSessionData({ classDate: '2026-10-20', startTime: '21:00', endTime: '18:00' }, today)).toThrow(BusinessRuleError);
  });
});

describe('normalizeClassCode', () => {
  it('acepta de 4 a 8 letras o números y lo normaliza', () => {
    expect(normalizeClassCode(' 12 34ab ')).toBe('1234AB');
    expect(() => normalizeClassCode('123')).toThrow(ValidationError);
    expect(() => normalizeClassCode('12-34')).toThrow(ValidationError);
  });
});
