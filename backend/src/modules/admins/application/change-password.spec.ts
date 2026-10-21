import { BusinessRuleError } from '../../../shared/domain/errors';
import { ensureStrongPassword } from './change-password.use-case';

describe('ensureStrongPassword', () => {
  it('exige al menos 8 caracteres con letras y números', () => {
    expect(() => ensureStrongPassword('clave2026')).not.toThrow();
    expect(() => ensureStrongPassword('abc123')).toThrow(BusinessRuleError);
    expect(() => ensureStrongPassword('solamenteletras')).toThrow(BusinessRuleError);
    expect(() => ensureStrongPassword('1234567890')).toThrow(BusinessRuleError);
  });
});
