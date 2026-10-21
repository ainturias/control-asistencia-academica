import { sessionRowsFromDrafts, studentRowsFromDrafts, validateSessions, validateStudents } from './import-validator';

describe('validateStudents (RF-11, RN-02)', () => {
  it('acepta filas válidas y normaliza correo y espacios', () => {
    const result = validateStudents([
      { row: 2, registrationNumber: ' 1001 ', fullName: 'Juan   Pérez', email: 'JUAN@Gmail.com', extra: {} },
    ]);
    expect(result.issues).toEqual([]);
    expect(result.students).toEqual([
      { registrationNumber: '1001', fullName: 'Juan Pérez', email: 'juan@gmail.com', extra: {} },
    ]);
  });

  it('informa campos obligatorios, correos inválidos y registros duplicados con su fila', () => {
    const { students, issues } = validateStudents([
      { row: 2, registrationNumber: '1001', fullName: 'Juan', email: 'juan@gmail.com', extra: {} },
      { row: 3, registrationNumber: '1001', fullName: 'Otro', email: 'otro@gmail.com', extra: {} },
      { row: 4, registrationNumber: '', fullName: '', email: 'malo', extra: {} },
    ]);
    expect(students).toHaveLength(1);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 3, field: 'Número de registro' }),
        expect.objectContaining({ row: 4, field: 'Número de registro', message: 'Es obligatorio' }),
        expect.objectContaining({ row: 4, field: 'Nombre completo' }),
        expect.objectContaining({ row: 4, field: 'Correo electrónico' }),
      ]),
    );
  });

  it('rechaza un archivo vacío', () => {
    expect(validateStudents([]).issues).toHaveLength(1);
  });
});

describe('validateSessions (RF-12)', () => {
  const row = (overrides = {}) => ({
    row: 2,
    rawDate: '05/10/2026',
    date: '2026-10-05',
    rawStart: '18:00',
    startTime: '18:00',
    rawEnd: '21:00',
    endTime: '21:00',
    ...overrides,
  });

  it('ordena las fechas válidas', () => {
    const { sessions, issues } = validateSessions([
      row({ row: 2, rawDate: '07/10/2026', date: '2026-10-07' }),
      row({ row: 3 }),
    ]);
    expect(issues).toEqual([]);
    expect(sessions.map((s) => s.date)).toEqual(['2026-10-05', '2026-10-07']);
  });

  it('detecta fechas inválidas, repetidas y horas invertidas', () => {
    const { issues } = validateSessions([
      row(),
      row({ row: 3 }),
      row({ row: 4, rawDate: '31/02/2026', date: null }),
      row({ row: 5, rawDate: '09/10/2026', date: '2026-10-09', startTime: '21:00', endTime: '18:00' }),
    ]);
    expect(issues.map((i) => i.row)).toEqual([3, 4, 5]);
  });
});

describe('borradores editados en la vista previa', () => {
  it('numera las filas según la tabla y conserva los campos adicionales', () => {
    const rows = studentRowsFromDrafts([
      { registrationNumber: '1', fullName: 'A', email: 'a@x.com', extra: { ci: '9' } },
      { registrationNumber: '2', fullName: 'B', email: 'b@x.com' },
    ]);
    expect(rows.map((r) => r.row)).toEqual([1, 2]);
    expect(validateStudents(rows).students[0].extra).toEqual({ ci: '9' });
  });

  it('valida fechas AAAA-MM-DD y horas HH:mm escritas a mano', () => {
    const { sessions, issues } = validateSessions(
      sessionRowsFromDrafts([
        { date: '2026-10-05', startTime: '18:00', endTime: '21:00' },
        { date: '2026-02-30', startTime: '18:00', endTime: '21:00' },
        { date: '2026-10-07', startTime: '25:00', endTime: '21:00' },
      ]),
    );
    expect(sessions).toEqual([{ date: '2026-10-05', startTime: '18:00', endTime: '21:00' }]);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, field: 'Fecha' }),
        expect.objectContaining({ row: 3, field: 'Hora inicio' }),
      ]),
    );
  });
});
