import { BusinessRuleError } from './errors';
import { extraFieldKey, normalizeExtraFields, pickExtraValues } from './extra-fields';

describe('campos adicionales', () => {
  it('genera claves estables desde el encabezado', () => {
    expect(extraFieldKey('Teléfono celular')).toBe('telefono_celular');
    expect(extraFieldKey('  C.I. ')).toBe('c_i');
    expect(extraFieldKey('¿?')).toBe('campo');
  });

  it('normaliza nombres, descarta claves repetidas y valida', () => {
    expect(
      normalizeExtraFields([
        { key: 'carrera', label: '  Carrera   profesional ', visibleToStudent: true },
        { key: 'carrera', label: 'Otra', visibleToStudent: false },
      ]),
    ).toEqual([{ key: 'carrera', label: 'Carrera profesional', visibleToStudent: true }]);
    expect(() => normalizeExtraFields([{ key: 'X Y', label: 'a', visibleToStudent: true }])).toThrow(BusinessRuleError);
    expect(() => normalizeExtraFields([{ key: 'a', label: ' ', visibleToStudent: true }])).toThrow(BusinessRuleError);
  });

  it('guarda solo los valores de campos definidos y no vacíos', () => {
    const fields = [{ key: 'ci', label: 'CI', visibleToStudent: false }];
    expect(pickExtraValues({ ci: ' 123  45 ', otra: 'x' }, fields)).toEqual({ ci: '123 45' });
    expect(pickExtraValues({ ci: '   ' }, fields)).toEqual({});
  });
});
