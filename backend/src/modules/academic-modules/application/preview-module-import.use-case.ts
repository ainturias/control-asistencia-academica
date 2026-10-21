import { Injectable } from '@nestjs/common';
import { ValidationError } from '../../../shared/domain/errors';
import type { ExtraColumn, ImportIssue, SessionDraft, StudentDraft } from '../domain/import/import-rows';
import {
  sessionRowsFromDrafts,
  studentRowsFromDrafts,
  validateSessions,
  validateStudents,
} from '../domain/import/import-validator';
import { ImportFileReader } from './import-file-reader.port';

export interface ImportFiles {
  students?: Buffer;
  sessions?: Buffer;
}

export interface ImportDraft {
  students: StudentDraft[];
  sessions: SessionDraft[];
}

/** Valida un borrador (leído de los Excel o editado en la vista previa). Los errores indican la fila de la tabla. */
export function validateDraft(draft: ImportDraft) {
  const students = validateStudents(studentRowsFromDrafts(draft.students));
  const sessions = validateSessions(sessionRowsFromDrafts(draft.sessions));
  return {
    valid: students.issues.length === 0 && sessions.issues.length === 0,
    students: students.students,
    sessions: sessions.sessions,
    errors: {
      students: students.issues,
      sessions: sessions.issues,
    } satisfies Record<string, ImportIssue[]>,
  };
}

/**
 * RF-16: lee ambos archivos y devuelve TODAS las filas (también las que tienen errores) para que el
 * administrador pueda corregirlas en la vista previa, más las columnas extra que trae el Excel.
 */
@Injectable()
export class PreviewModuleImportUseCase {
  constructor(private readonly reader: ImportFileReader) {}

  async execute(files: ImportFiles) {
    if (!files.students || !files.sessions) {
      throw new ValidationError(
        'Debes adjuntar el Excel de estudiantes y el Excel de fechas de clase',
      );
    }

    const [studentFile, sessionRows] = await Promise.all([
      this.reader.readStudents(files.students),
      this.reader.readSessions(files.sessions),
    ]);
    const draft: ImportDraft = {
      students: studentFile.rows.map((r) => ({
        registrationNumber: r.registrationNumber,
        fullName: r.fullName,
        email: r.email,
        extra: r.extra,
      })),
      // Lo que no se pudo interpretar se devuelve tal cual para que se corrija a mano.
      sessions: sessionRows.map((r) => ({
        date: r.date ?? r.rawDate,
        startTime: r.startTime ?? r.rawStart,
        endTime: r.endTime ?? r.rawEnd,
      })),
    };
    const extraColumns: ExtraColumn[] = studentFile.extraColumns.map(({ key, header }) => ({ key, header }));
    const { valid, errors } = validateDraft(draft);
    return { valid, draft, extraColumns, errors };
  }
}
