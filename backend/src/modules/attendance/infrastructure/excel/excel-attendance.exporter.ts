import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { Clock } from '../../../../shared/application/clock.port';
import { AttendanceExporter } from '../../application/attendance-exporter.port';
import type { AttendanceOverview } from '../../application/get-attendance-overview.use-case';
import type { AttendanceDisplayStatus } from '../../domain/attendance-status';

const PALETTE = {
  primary: 'FF5046E5',
  presentBg: 'FFEEEDFD',
  presentText: 'FF3A31C7',
  absentBg: 'FFFFEDE1',
  absentText: 'FFB4440A',
  lateBg: 'FFFEF3C7',
  lateText: 'FF92400E',
  excusedBg: 'FFE0F2FE',
  excusedText: 'FF075985',
  muted: 'FF5A6078',
};

const SHORT: Record<AttendanceDisplayStatus, string> = {
  PRESENTE: 'P',
  ATRASO: 'A',
  FALTA: 'F',
  JUSTIFICADO: 'J',
  CANCELADA: 'C',
  PENDIENTE: '·',
  PROGRAMADA: '',
};

@Injectable()
export class ExcelAttendanceExporter extends AttendanceExporter {
  private readonly timeFormat: Intl.DateTimeFormat;

  constructor(clock: Clock) {
    super();
    this.timeFormat = new Intl.DateTimeFormat('es-BO', {
      timeZone: clock.timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  async export(overview: AttendanceOverview): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Control de Asistencia';
    this.addMatrixSheet(workbook, overview);
    this.addDetailSheet(workbook, overview);
    const data = await workbook.xlsx.writeBuffer();
    return Buffer.from(data as ArrayBuffer);
  }

  private addMatrixSheet(workbook: ExcelJS.Workbook, overview: AttendanceOverview) {
    const sheet = workbook.addWorksheet('Asistencias', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 3 }],
    });

    sheet.getCell('A1').value = `Asistencias · ${overview.module.name}`;
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: PALETTE.primary } };
    sheet.getCell('A2').value = `Generado el ${formatDate(overview.today)} · ${
      overview.rules.enabled
        ? 'P = Presente, A = Atraso, F = Falta, J = Justificado, C = Clase cancelada'
        : 'P = Presente, F = Falta, J = Justificado, C = Clase cancelada'
    }`;
    sheet.getCell('A2').font = { italic: true, color: { argb: PALETTE.muted } };

    const header = [
      'Nº registro',
      'Nombre completo',
      'Correo',
      ...overview.extraFields.map((f) => f.label),
      ...overview.sessions.map((s) => formatDate(s.classDate)),
      'Presentes',
      ...(overview.rules.enabled ? ['Atrasos'] : []),
      'Faltas',
      ...(overview.rules.enabled ? ['Justificados'] : []),
      '% Asistencia',
    ];
    const headerRow = sheet.getRow(3);
    headerRow.values = header;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETTE.primary } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    for (const row of overview.rows) {
      const excelRow = sheet.addRow([
        row.student.registrationNumber,
        row.student.fullName,
        row.student.email,
        ...overview.extraFields.map((f) => row.student.extra[f.key] ?? ''),
        ...row.records.map((r) => SHORT[r.status]),
        row.summary.presentes,
        ...(overview.rules.enabled ? [row.summary.atrasos] : []),
        row.summary.faltas,
        ...(overview.rules.enabled ? [row.summary.justificados] : []),
        row.summary.percentage === null ? '' : row.summary.percentage / 100,
      ]);
      row.records.forEach((record, i) => {
        const cell = excelRow.getCell(4 + overview.extraFields.length + i);
        cell.alignment = { horizontal: 'center' };
        if (record.status === 'PRESENTE') paint(cell, PALETTE.presentBg, PALETTE.presentText);
        if (record.status === 'FALTA') paint(cell, PALETTE.absentBg, PALETTE.absentText);
        if (record.status === 'ATRASO') paint(cell, PALETTE.lateBg, PALETTE.lateText);
        if (record.status === 'JUSTIFICADO') paint(cell, PALETTE.excusedBg, PALETTE.excusedText);
      });
      excelRow.getCell(header.length).numFmt = '0%';
    }

    const totalsRow = sheet.addRow([
      '',
      'Presentes por fecha',
      '',
      ...overview.extraFields.map(() => ''),
      ...overview.sessionTotals.map((t) => t.presentes),
    ]);
    totalsRow.font = { bold: true };
    const absentRow = sheet.addRow([
      '',
      'Faltas por fecha',
      '',
      ...overview.extraFields.map(() => ''),
      ...overview.sessionTotals.map((t) => t.faltas),
    ]);
    absentRow.font = { bold: true };

    sheet.getColumn(1).width = 14;
    sheet.getColumn(2).width = 34;
    sheet.getColumn(3).width = 30;
    for (let i = 4; i <= header.length; i++) sheet.getColumn(i).width = 12;
    overview.extraFields.forEach((_, i) => (sheet.getColumn(4 + i).width = 20));
  }

  private addDetailSheet(workbook: ExcelJS.Workbook, overview: AttendanceOverview) {
    const sheet = workbook.addWorksheet('Detalle');
    sheet.columns = [
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Nº registro', key: 'registration', width: 14 },
      { header: 'Nombre completo', key: 'name', width: 34 },
      { header: 'Estado', key: 'status', width: 13 },
      { header: 'Hora de marca', key: 'markedAt', width: 14 },
      { header: 'Origen', key: 'source', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };

    overview.sessions.forEach((session, i) => {
      for (const row of overview.rows) {
        const record = row.records[i];
        sheet.addRow({
          date: formatDate(session.classDate),
          registration: row.student.registrationNumber,
          name: row.student.fullName,
          status: record.status,
          markedAt:
            (record.status === 'PRESENTE' || record.status === 'ATRASO') && record.markedAt
              ? this.timeFormat.format(record.markedAt)
              : '',
          source:
            record.source === 'ADMIN'
              ? 'Administrador'
              : record.source === 'STUDENT'
                ? 'Estudiante'
                : '',
        });
      }
    });
  }
}

function paint(cell: ExcelJS.Cell, bg: string, fg: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = { bold: true, color: { argb: fg } };
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
