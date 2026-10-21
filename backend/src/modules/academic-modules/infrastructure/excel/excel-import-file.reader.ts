import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ValidationError } from '../../../../shared/domain/errors';
import { ImportFileReader } from '../../application/import-file-reader.port';
import { extraFieldKey, MAX_EXTRA_FIELDS } from '../../../../shared/domain/extra-fields';
import type { ExtraColumn, RawSessionRow, RawStudentRow } from '../../domain/import/import-rows';
import {
  CellPrimitive,
  normalizeHeader,
  parseDate,
  parseTime,
  toPrimitive,
  toText,
} from './excel-cell';

interface ColumnSpec<K extends string> {
  key: K;
  label: string;
  matches: (header: string) => boolean;
}

const STUDENT_COLUMNS: ColumnSpec<'registration' | 'name' | 'email'>[] = [
  { key: 'registration', label: 'Número de registro', matches: (h) => /registro|matricula|codigo/.test(h) },
  { key: 'name', label: 'Nombre completo', matches: (h) => h.includes('nombre') },
  { key: 'email', label: 'Correo electrónico', matches: (h) => /correo|e-?mail/.test(h) },
];

const SESSION_COLUMNS: ColumnSpec<'date' | 'start' | 'end'>[] = [
  { key: 'date', label: 'Fecha', matches: (h) => h.includes('fecha') },
  { key: 'start', label: 'Hora inicio', matches: (h) => h.includes('inicio') },
  { key: 'end', label: 'Hora fin', matches: (h) => /\bfin\b|final|termino/.test(h) },
];

const HEADER_SEARCH_ROWS = 10;

@Injectable()
export class ExcelImportFileReader extends ImportFileReader {
  async readStudents(file: Buffer): Promise<{ rows: RawStudentRow[]; extraColumns: ExtraColumn[] }> {
    const { rows, extraColumns } = await this.readTable(file, STUDENT_COLUMNS, 'estudiantes', true);
    return {
      extraColumns,
      rows: rows.map(({ row, cells, extra }) => ({
        row,
        registrationNumber: toText(cells.registration),
        fullName: toText(cells.name),
        email: toText(cells.email),
        extra,
      })),
    };
  }

  async readSessions(file: Buffer): Promise<RawSessionRow[]> {
    const { rows } = await this.readTable(file, SESSION_COLUMNS, 'fechas de clase', false);
    return rows.map(({ row, cells }) => ({
      row,
      rawDate: toText(cells.date),
      date: parseDate(cells.date),
      rawStart: toText(cells.start),
      startTime: parseTime(cells.start),
      rawEnd: toText(cells.end),
      endTime: parseTime(cells.end),
    }));
  }

  private async readTable<K extends string>(
    file: Buffer,
    columns: ColumnSpec<K>[],
    fileLabel: string,
    collectExtras: boolean,
  ): Promise<{
    rows: { row: number; cells: Record<K, CellPrimitive>; extra: Record<string, string> }[];
    extraColumns: (ExtraColumn & { col: number })[];
  }> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(file as unknown as ExcelJS.Buffer);
    } catch {
      throw new ValidationError(
        `El archivo de ${fileLabel} no es un Excel válido (formato .xlsx)`,
      );
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new ValidationError(`El archivo de ${fileLabel} no tiene hojas`);

    // Busca la fila de encabezados en las primeras filas.
    let headerRow = 0;
    let columnIndex: Partial<Record<K, number>> = {};
    for (let r = 1; r <= Math.min(HEADER_SEARCH_ROWS, sheet.rowCount); r++) {
      const found: Partial<Record<K, number>> = {};
      sheet.getRow(r).eachCell((cell, col) => {
        const header = normalizeHeader(toText(toPrimitive(cell.value)));
        for (const spec of columns) {
          if (found[spec.key] === undefined && spec.matches(header)) found[spec.key] = col;
        }
      });
      if (columns.every((spec) => found[spec.key] !== undefined)) {
        headerRow = r;
        columnIndex = found;
        break;
      }
    }

    if (!headerRow) {
      throw new ValidationError(
        `En el archivo de ${fileLabel} no se encontraron los encabezados: ${columns.map((c) => c.label).join(', ')}`,
      );
    }

    // Columnas con encabezado que no son las obligatorias: candidatas a campos adicionales.
    const extraColumns: (ExtraColumn & { col: number })[] = [];
    if (collectExtras) {
      const used = new Set(Object.values(columnIndex) as number[]);
      const keys = new Set<string>();
      sheet.getRow(headerRow).eachCell((cell, col) => {
        const header = toText(toPrimitive(cell.value)).replace(/\s+/g, ' ').trim();
        if (used.has(col) || !header || extraColumns.length >= MAX_EXTRA_FIELDS) return;
        let key = extraFieldKey(header);
        for (let n = 2; keys.has(key); n++) key = `${extraFieldKey(header).slice(0, 36)}_${n}`;
        keys.add(key);
        extraColumns.push({ key, header, col });
      });
    }

    const result: { row: number; cells: Record<K, CellPrimitive>; extra: Record<string, string> }[] = [];
    for (let r = headerRow + 1; r <= sheet.rowCount; r++) {
      const excelRow = sheet.getRow(r);
      const cells = {} as Record<K, CellPrimitive>;
      let empty = true;
      for (const spec of columns) {
        const value = toPrimitive(excelRow.getCell(columnIndex[spec.key] as number).value);
        cells[spec.key] = typeof value === 'string' ? value.trim() || null : value;
        if (cells[spec.key] !== null) empty = false;
      }
      const extra: Record<string, string> = {};
      for (const column of extraColumns) {
        const text = toText(toPrimitive(excelRow.getCell(column.col).value)).trim();
        if (text) extra[column.key] = text;
      }
      if (!empty) result.push({ row: r, cells, extra });
    }
    return { rows: result, extraColumns };
  }
}
