import type { ExtraColumn, RawSessionRow, RawStudentRow } from '../domain/import/import-rows';

/** Puerto de entrada de archivos de importación (Excel u otro formato). */
export abstract class ImportFileReader {
  /** Además de las columnas obligatorias, devuelve las columnas extra que traiga el archivo. */
  abstract readStudents(file: Buffer): Promise<{ rows: RawStudentRow[]; extraColumns: ExtraColumn[] }>;
  abstract readSessions(file: Buffer): Promise<RawSessionRow[]>;
}
