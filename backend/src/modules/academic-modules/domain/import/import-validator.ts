import type {
  ImportIssue,
  RawSessionRow,
  RawStudentRow,
  SessionDraft,
  SessionImport,
  StudentDraft,
  StudentImport,
} from './import-rows';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** RF-11 / RN-02: campos obligatorios, formato y duplicados. */
export function validateStudents(rows: RawStudentRow[]): {
  students: StudentImport[];
  issues: ImportIssue[];
} {
  const issues: ImportIssue[] = [];
  if (rows.length === 0) {
    issues.push({ row: null, field: null, message: 'El archivo no contiene estudiantes' });
    return { students: [], issues };
  }

  const firstRowByRegistration = new Map<string, number>();
  const firstRowByEmail = new Map<string, number>();
  const students: StudentImport[] = [];

  for (const raw of rows) {
    const registrationNumber = raw.registrationNumber.trim();
    const fullName = raw.fullName.replace(/\s+/g, ' ').trim();
    const email = raw.email.trim().toLowerCase();
    const before = issues.length;
    const issue = (field: string, message: string) =>
      issues.push({ row: raw.row, field, message });

    if (!registrationNumber) issue('Número de registro', 'Es obligatorio');
    else if (registrationNumber.length > 30) issue('Número de registro', 'Máximo 30 caracteres');
    else if (firstRowByRegistration.has(registrationNumber)) {
      issue(
        'Número de registro',
        `El registro ${registrationNumber} está duplicado (ya aparece en la fila ${firstRowByRegistration.get(registrationNumber)})`,
      );
    } else firstRowByRegistration.set(registrationNumber, raw.row);

    if (!fullName) issue('Nombre completo', 'Es obligatorio');
    else if (fullName.length > 150) issue('Nombre completo', 'Máximo 150 caracteres');

    if (!email) issue('Correo electrónico', 'Es obligatorio');
    else if (!EMAIL_PATTERN.test(email) || email.length > 150) {
      issue('Correo electrónico', `"${raw.email}" no es un correo válido`);
    } else if (firstRowByEmail.has(email)) {
      issue(
        'Correo electrónico',
        `El correo ${email} está duplicado (ya aparece en la fila ${firstRowByEmail.get(email)})`,
      );
    } else firstRowByEmail.set(email, raw.row);

    if (issues.length === before) students.push({ registrationNumber, fullName, email, extra: raw.extra });
  }

  return { students, issues };
}

/** RF-12: fechas válidas, horas válidas y sin fechas repetidas. */
export function validateSessions(rows: RawSessionRow[]): {
  sessions: SessionImport[];
  issues: ImportIssue[];
} {
  const issues: ImportIssue[] = [];
  if (rows.length === 0) {
    issues.push({ row: null, field: null, message: 'El archivo no contiene fechas de clase' });
    return { sessions: [], issues };
  }

  const firstRowByDate = new Map<string, number>();
  const sessions: SessionImport[] = [];

  for (const raw of rows) {
    const before = issues.length;
    const issue = (field: string, message: string) =>
      issues.push({ row: raw.row, field, message });

    if (!raw.rawDate) issue('Fecha', 'Es obligatoria');
    else if (!raw.date) issue('Fecha', `"${raw.rawDate}" no es una fecha válida (use DD/MM/AAAA)`);
    else if (firstRowByDate.has(raw.date)) {
      issue('Fecha', `La fecha ${raw.rawDate} está repetida (ya aparece en la fila ${firstRowByDate.get(raw.date)})`);
    } else firstRowByDate.set(raw.date, raw.row);

    if (!raw.rawStart) issue('Hora inicio', 'Es obligatoria');
    else if (!raw.startTime) issue('Hora inicio', `"${raw.rawStart}" no es una hora válida (use HH:MM)`);

    if (!raw.rawEnd) issue('Hora fin', 'Es obligatoria');
    else if (!raw.endTime) issue('Hora fin', `"${raw.rawEnd}" no es una hora válida (use HH:MM)`);

    if (raw.startTime && raw.endTime && raw.startTime >= raw.endTime) {
      issue('Hora fin', 'Debe ser posterior a la hora de inicio');
    }

    if (issues.length === before && raw.date && raw.startTime && raw.endTime) {
      sessions.push({ date: raw.date, startTime: raw.startTime, endTime: raw.endTime });
    }
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date));
  return { sessions, issues };
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;

const validIsoDate = (text: string) => {
  const match = ISO_DATE.exec(text);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? text : null;
};

/** Filas editadas en la vista previa; la fila es la posición en la tabla (1, 2, 3…). */
export function studentRowsFromDrafts(drafts: StudentDraft[]): RawStudentRow[] {
  return drafts.map((draft, index) => ({
    row: index + 1,
    registrationNumber: draft.registrationNumber ?? '',
    fullName: draft.fullName ?? '',
    email: draft.email ?? '',
    extra: draft.extra ?? {},
  }));
}

/** Las fechas editadas llegan en AAAA-MM-DD y las horas en HH:mm. */
export function sessionRowsFromDrafts(drafts: SessionDraft[]): RawSessionRow[] {
  return drafts.map((draft, index) => {
    const rawDate = (draft.date ?? '').trim();
    const rawStart = (draft.startTime ?? '').trim();
    const rawEnd = (draft.endTime ?? '').trim();
    return {
      row: index + 1,
      rawDate,
      date: validIsoDate(rawDate),
      rawStart,
      startTime: HH_MM.test(rawStart) ? rawStart : null,
      rawEnd,
      endTime: HH_MM.test(rawEnd) ? rawEnd : null,
    };
  });
}
