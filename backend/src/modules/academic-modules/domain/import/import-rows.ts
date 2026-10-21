/** Fila de estudiante tal como se leyó del archivo (sin validar). */
export interface RawStudentRow {
  row: number;
  registrationNumber: string;
  fullName: string;
  email: string;
  /** Columnas adicionales del archivo, por clave. */
  extra: Record<string, string>;
}

/** Columna del Excel que no es de las obligatorias. */
export interface ExtraColumn {
  key: string;
  header: string;
}

/** Fila de fecha de clase leída del archivo; los campos normalizados son null si no se pudieron interpretar. */
export interface RawSessionRow {
  row: number;
  rawDate: string;
  date: string | null; // YYYY-MM-DD
  rawStart: string;
  startTime: string | null; // HH:mm
  rawEnd: string;
  endTime: string | null; // HH:mm
}

export interface StudentImport {
  registrationNumber: string;
  fullName: string;
  email: string;
  extra: Record<string, string>;
}

/** Fila editable de la vista previa (lo que el admin puede corregir antes de activar). */
export interface StudentDraft {
  registrationNumber: string;
  fullName: string;
  email: string;
  extra?: Record<string, string>;
}

/** Fecha editable: `date` en AAAA-MM-DD y horas en HH:mm cuando son válidas; si no, el texto original. */
export interface SessionDraft {
  date: string;
  startTime: string;
  endTime: string;
}

export interface SessionImport {
  date: string;
  startTime: string;
  endTime: string;
}

export interface ImportIssue {
  row: number | null;
  field: string | null;
  message: string;
}
