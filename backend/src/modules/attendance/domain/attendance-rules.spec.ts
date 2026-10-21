import { BusinessRuleError, ConflictError } from '../../../shared/domain/errors';
import type { Attendance } from './attendance';
import { DEFAULT_ATTENDANCE_RULES } from '../../../shared/domain/attendance-rules';
import {
  ensureAdminChangeIsEffective,
  ensureClassCode,
  ensureStatusAllowed,
  ensureStudentCanMark,
  statusForStudentMark,
} from './attendance-policy';
import { resolveAttendanceStatus } from './attendance-status';
import { summarize } from './attendance-summary';
import { classifyMoment, markCountdown, markWindowFor } from './mark-window';

const TODAY = '2026-10-14';

const attendance = (overrides: Partial<Attendance> = {}): Attendance => ({
  id: 1,
  moduleId: 1,
  studentId: 1,
  sessionId: 1,
  status: 'PRESENTE',
  source: 'STUDENT',
  markedAt: new Date(),
  updatedAt: new Date(),
  adminNote: null,
  ...overrides,
});

describe('resolveAttendanceStatus (RN-05)', () => {
  it('usa el estado guardado cuando existe', () => {
    expect(resolveAttendanceStatus('PRESENTE', '2026-10-01', TODAY)).toBe('PRESENTE');
    expect(resolveAttendanceStatus('FALTA', '2026-10-20', TODAY)).toBe('FALTA');
  });

  it('sin marca: fecha pasada es FALTA, hoy PENDIENTE y futura PROGRAMADA', () => {
    expect(resolveAttendanceStatus(null, '2026-10-13', TODAY)).toBe('FALTA');
    expect(resolveAttendanceStatus(null, TODAY, TODAY)).toBe('PENDIENTE');
    expect(resolveAttendanceStatus(null, '2026-10-15', TODAY)).toBe('PROGRAMADA');
  });

  it('hoy sin marca y con el plazo cerrado es FALTA', () => {
    expect(resolveAttendanceStatus(null, TODAY, TODAY, true)).toBe('FALTA');
  });
});

const RULES = { ...DEFAULT_ATTENDANCE_RULES, enabled: true };
const CLASS = { startTime: '19:00', endTime: '22:00' };

describe('markWindowFor', () => {
  it('sin reglas no hay ventana (se marca todo el día)', () => {
    expect(markWindowFor(DEFAULT_ATTENDANCE_RULES, CLASS)).toBeNull();
    expect(classifyMoment(null, '23:59')).toBe('ON_TIME');
  });

  it('calcula apertura, tolerancia y límite desde la hora de inicio', () => {
    expect(markWindowFor(RULES, CLASS)).toEqual({
      opensAt: '18:45',
      onTimeUntil: '19:20',
      lateUntil: '20:00',
    });
  });

  it('no se extiende más allá del fin de la clase', () => {
    expect(markWindowFor({ ...RULES, lateLimitMinutes: 300 }, CLASS)?.lateUntil).toBe('22:00');
  });
});

describe('statusForStudentMark', () => {
  const window = markWindowFor(RULES, CLASS);

  it('Presente hasta la tolerancia (inclusive) y Atraso hasta el límite', () => {
    expect(statusForStudentMark(window, '18:45')).toBe('PRESENTE');
    expect(statusForStudentMark(window, '19:20')).toBe('PRESENTE');
    expect(statusForStudentMark(window, '19:21')).toBe('ATRASO');
    expect(statusForStudentMark(window, '20:00')).toBe('ATRASO');
  });

  it('rechaza marcas antes de la apertura o después del límite', () => {
    expect(() => statusForStudentMark(window, '18:44')).toThrow(BusinessRuleError);
    expect(() => statusForStudentMark(window, '20:01')).toThrow(BusinessRuleError);
  });

  it('sin reglas siempre es Presente', () => {
    expect(statusForStudentMark(null, '21:59')).toBe('PRESENTE');
  });
});

describe('ensureStatusAllowed', () => {
  it('sin reglas permite Presente, Falta y Justificado, pero no Atraso', () => {
    expect(() => ensureStatusAllowed(DEFAULT_ATTENDANCE_RULES, 'ATRASO')).toThrow(BusinessRuleError);
    expect(() => ensureStatusAllowed(DEFAULT_ATTENDANCE_RULES, 'FALTA')).not.toThrow();
    expect(() => ensureStatusAllowed(DEFAULT_ATTENDANCE_RULES, 'JUSTIFICADO')).not.toThrow();
    expect(() => ensureStatusAllowed(RULES, 'JUSTIFICADO')).not.toThrow();
  });
});

describe('ensureStudentCanMark (RN-03, RN-04)', () => {
  it('rechaza si hoy no hay clase', () => {
    expect(() => ensureStudentCanMark(false, null)).toThrow(BusinessRuleError);
  });

  it('rechaza una segunda marca', () => {
    expect(() => ensureStudentCanMark(true, attendance())).toThrow(ConflictError);
  });

  it('permite marcar el día de clase sin registro previo', () => {
    expect(() => ensureStudentCanMark(true, null)).not.toThrow();
  });
});

describe('ensureAdminChangeIsEffective (RN-06)', () => {
  it('rechaza cambiar al mismo estado', () => {
    expect(() => ensureAdminChangeIsEffective('FALTA', 'FALTA')).toThrow(BusinessRuleError);
  });

  it('permite corregir una falta derivada a presente', () => {
    expect(() => ensureAdminChangeIsEffective('FALTA', 'PRESENTE')).not.toThrow();
    expect(() => ensureAdminChangeIsEffective('PROGRAMADA', 'FALTA')).not.toThrow();
  });
});

describe('summarize', () => {
  it('calcula el porcentaje solo sobre fechas evaluadas', () => {
    expect(summarize(['PRESENTE', 'FALTA', 'FALTA', 'FALTA', 'PENDIENTE', 'PROGRAMADA'])).toEqual({
      total: 6,
      presentes: 1,
      atrasos: 0,
      faltas: 3,
      justificados: 0,
      pendientes: 1,
      programadas: 1,
      completed: 4,
      points: 2,
      maxPoints: 8,
      percentage: 25,
      atRisk: true,
    });
  });

  it('el atraso cuenta como asistencia y lo justificado no se evalúa', () => {
    const summary = summarize(['PRESENTE', 'ATRASO', 'FALTA', 'JUSTIFICADO']);
    expect(summary.percentage).toBe(67);
    expect(summary.completed).toBe(4);
    expect([summary.points, summary.maxPoints]).toEqual([3, 6]);
  });

  it('usa los puntos y el mínimo configurados', () => {
    const scoring = { presentPoints: 10, latePoints: 5, minAttendancePercentage: 50 };
    const summary = summarize(['PRESENTE', 'ATRASO', 'FALTA'], scoring);
    expect([summary.points, summary.maxPoints]).toEqual([15, 30]);
    expect(summary.atRisk).toBe(false);
  });

  it('devuelve porcentaje null si aún no hay fechas evaluadas', () => {
    expect(summarize(['PROGRAMADA', 'PENDIENTE']).percentage).toBeNull();
  });
});

describe('markCountdown', () => {
  const window = markWindowFor(RULES, CLASS);
  const at = (time: string) => {
    const [h, m, s] = time.split(':').map(Number);
    return h * 3600 + m * 60 + s;
  };

  it('cuenta hasta la apertura, el fin de la tolerancia y el cierre', () => {
    expect(markCountdown(window, at('18:00:00'))).toEqual({
      opensInSeconds: 45 * 60,
      onTimeEndsInSeconds: 81 * 60,
      closesInSeconds: 121 * 60,
    });
  });

  it('sin reglas se puede marcar hasta la medianoche', () => {
    expect(markCountdown(null, at('23:00:00'))).toEqual({
      opensInSeconds: 0,
      onTimeEndsInSeconds: null,
      closesInSeconds: 3600,
    });
  });
});

describe('ensureClassCode', () => {
  it('no exige nada si el módulo no usa código', () => {
    expect(() => ensureClassCode(false, null, undefined)).not.toThrow();
  });
  it('compara sin distinguir mayúsculas ni espacios', () => {
    expect(() => ensureClassCode(true, '1234AB', ' 1234ab ')).not.toThrow();
    expect(() => ensureClassCode(true, '1234AB', '9999')).toThrow(BusinessRuleError);
  });
  it('avisa si el docente no publicó el código o si no se escribió', () => {
    expect(() => ensureClassCode(true, null, '1234')).toThrow(BusinessRuleError);
    expect(() => ensureClassCode(true, '1234', '')).toThrow(BusinessRuleError);
  });
});

describe('clases canceladas', () => {
  it('no cuentan en el resumen', () => {
    const summary = summarize(['PRESENTE', 'CANCELADA', 'FALTA']);
    expect(summary.total).toBe(2);
    expect(summary.percentage).toBe(50);
  });
});

describe('marcar solo durante el horario de la clase (sin puntualidad)', () => {
  const HOURS_ONLY = { ...DEFAULT_ATTENDANCE_RULES, classHoursOnly: true };

  it('la ventana va de la hora de inicio a la de fin de cada clase', () => {
    expect(markWindowFor(HOURS_ONLY, CLASS)).toEqual({ opensAt: '19:00', onTimeUntil: '22:00', lateUntil: '22:00' });
    expect(markWindowFor(HOURS_ONLY, { startTime: '08:30:00', endTime: '10:00:00' })).toEqual({
      opensAt: '08:30',
      onTimeUntil: '10:00',
      lateUntil: '10:00',
    });
  });

  it('dentro del horario siempre es Presente; antes o después se rechaza', () => {
    const window = markWindowFor(HOURS_ONLY, CLASS);
    expect(() => statusForStudentMark(window, '18:59')).toThrow(BusinessRuleError);
    expect(statusForStudentMark(window, '19:00')).toBe('PRESENTE');
    expect(statusForStudentMark(window, '21:30')).toBe('PRESENTE');
    expect(statusForStudentMark(window, '22:00')).toBe('PRESENTE');
    expect(() => statusForStudentMark(window, '22:01')).toThrow(BusinessRuleError);
  });

  it('la cuenta regresiva termina al final de la clase, no a la medianoche', () => {
    const window = markWindowFor(HOURS_ONLY, CLASS);
    expect(markCountdown(window, 18 * 3600 + 30 * 60)).toEqual({
      opensInSeconds: 30 * 60,
      onTimeEndsInSeconds: 3 * 3600 + 31 * 60,
      closesInSeconds: 3 * 3600 + 31 * 60,
    });
  });

  it('con puntualidad activada manda la puntualidad', () => {
    expect(markWindowFor({ ...RULES, classHoursOnly: true }, CLASS)).toEqual(markWindowFor(RULES, CLASS));
  });
});
