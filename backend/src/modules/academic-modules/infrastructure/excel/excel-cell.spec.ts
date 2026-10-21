import { parseDate, parseTime, toPrimitive } from './excel-cell';

describe('parseDate', () => {
  it('acepta fecha nativa, serial de Excel y texto DD/MM/AAAA o AAAA-MM-DD', () => {
    expect(parseDate(new Date(Date.UTC(2026, 9, 5)))).toBe('2026-10-05');
    expect(parseDate(46300)).toBe('2026-10-05');
    expect(parseDate('5/10/2026')).toBe('2026-10-05');
    expect(parseDate('2026-10-05')).toBe('2026-10-05');
  });

  it('rechaza fechas imposibles o texto libre', () => {
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('mañana')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

describe('parseTime', () => {
  it('acepta hora nativa, fracción de día, texto y formato am/pm', () => {
    expect(parseTime(new Date(Date.UTC(1899, 11, 30, 18, 0)))).toBe('18:00');
    expect(parseTime(0.75)).toBe('18:00');
    expect(parseTime('9:30')).toBe('09:30');
    expect(parseTime('6:00 pm')).toBe('18:00');
    expect(parseTime('12:15 am')).toBe('00:15');
  });

  it('rechaza horas inválidas', () => {
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('hola')).toBeNull();
  });
});

describe('toPrimitive', () => {
  it('extrae el texto de hipervínculos, texto enriquecido y fórmulas', () => {
    expect(toPrimitive({ text: 'juan@gmail.com', hyperlink: 'mailto:juan@gmail.com' })).toBe('juan@gmail.com');
    expect(toPrimitive({ richText: [{ text: 'Juan ' }, { text: 'Pérez' }] })).toBe('Juan Pérez');
    expect(toPrimitive({ formula: 'A1', result: 1001 })).toBe(1001);
  });
});
