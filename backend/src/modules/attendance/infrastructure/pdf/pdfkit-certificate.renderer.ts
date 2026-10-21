import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { CertificateData } from '../../application/certificate-renderer.port';
import { CertificateRenderer } from '../../application/certificate-renderer.port';
import type { AttendanceDisplayStatus } from '../../domain/attendance-status';

const COLORS = {
  brand: '#5046e5',
  ink: '#111427',
  muted: '#5a6078',
  line: '#e6e8f2',
  soft: '#f5f6fb',
  ok: '#0f8f86',
  alert: '#b4440a',
};

const LABELS: Record<AttendanceDisplayStatus, string> = {
  PRESENTE: 'Presente',
  ATRASO: 'Atraso',
  FALTA: 'Falta',
  JUSTIFICADO: 'Justificado',
  PENDIENTE: 'Pendiente',
  PROGRAMADA: 'Programada',
  CANCELADA: 'Cancelada',
};

const fmtDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Constancia de asistencia en A4 con datos del estudiante, resumen y detalle de cada clase. */
@Injectable()
export class PdfkitCertificateRenderer extends CertificateRenderer {
  render(data: CertificateData): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Constancia de asistencia' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const time = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: data.timeZone });
    const dateTime = new Intl.DateTimeFormat('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: data.timeZone,
    });
    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;

    // Encabezado
    doc.rect(0, 0, doc.page.width, 110).fill(COLORS.brand);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica').text('SISTEMA DE REGISTRO Y CONTROL DE ASISTENCIA', left, 32, { characterSpacing: 1.5 });
    doc.fontSize(22).font('Helvetica-Bold').text('Constancia de asistencia', left, 50);
    doc.fontSize(11).font('Helvetica').text(data.module.name, left, 80);
    doc.y = 135;

    // Datos
    const field = (label: string, value: string) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(label.toUpperCase(), { continued: false });
      doc.font('Helvetica').fontSize(11).fillColor(COLORS.ink).text(value || '-').moveDown(0.5);
    };
    const columnTop = doc.y;
    doc.x = left;
    field('Estudiante', data.student.fullName);
    field('Número de registro', data.student.registrationNumber);
    field('Correo electrónico', data.student.email);
    for (const extra of data.extraFields) {
      if (data.student.extra[extra.key]) field(extra.label, data.student.extra[extra.key]);
    }
    const leftBottom = doc.y;
    doc.y = columnTop;
    const half = left + width / 2 + 10;
    const rightField = (label: string, value: string) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.muted).text(label.toUpperCase(), half, doc.y);
      doc.font('Helvetica').fontSize(11).fillColor(COLORS.ink).text(value || '-', half).moveDown(0.5);
    };
    rightField('Módulo', data.module.name);
    rightField(
      'Periodo',
      data.module.firstDate && data.module.lastDate ? `${fmtDate(data.module.firstDate)} al ${fmtDate(data.module.lastDate)}` : '-',
    );
    rightField('Docente', data.teacher ?? '-');
    doc.y = Math.max(leftBottom, doc.y) + 8;
    doc.x = left;

    // Resumen
    const s = data.summary;
    const boxTop = doc.y;
    doc.roundedRect(left, boxTop, width, 70, 8).fill(COLORS.soft);
    const stats: [string, string][] = [
      ['Clases', String(s.total)],
      ['Presentes', String(s.presentes)],
      ['Atrasos', String(s.atrasos)],
      ['Faltas', String(s.faltas)],
      ['Justificadas', String(s.justificados)],
      ['Asistencia', s.percentage === null ? '-' : `${s.percentage}%`],
      ['Puntos', `${s.points}/${s.maxPoints}`],
    ];
    const cell = width / stats.length;
    stats.forEach(([label, value], i) => {
      doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.ink).text(value, left + i * cell, boxTop + 16, { width: cell, align: 'center' });
      doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(label, left + i * cell, boxTop + 40, { width: cell, align: 'center' });
    });
    doc.y = boxTop + 82;
    const meets = s.percentage === null || !s.atRisk;
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(meets ? COLORS.ok : COLORS.alert)
      .text(
        meets
          ? `Cumple con la asistencia mínima del módulo (${data.module.minAttendance}%).`
          : `No alcanza la asistencia mínima del módulo (${data.module.minAttendance}%).`,
        left,
      );
    doc.moveDown(1);

    // Detalle por clase
    const cols = [
      { title: 'Fecha', width: 0.2 },
      { title: 'Horario', width: 0.22 },
      { title: 'Estado', width: 0.2 },
      { title: 'Hora de marca', width: 0.2 },
      { title: 'Puntos', width: 0.18 },
    ];
    const header = () => {
      const y = doc.y;
      doc.rect(left, y, width, 22).fill(COLORS.brand);
      let x = left;
      for (const col of cols) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(col.title, x + 8, y + 7, { width: col.width * width - 16 });
        x += col.width * width;
      }
      doc.y = y + 22;
    };
    header();
    data.records.forEach((record, index) => {
      if (doc.y > doc.page.height - 110) {
        doc.addPage();
        header();
      }
      const y = doc.y;
      if (index % 2 === 1) doc.rect(left, y, width, 20).fill(COLORS.soft);
      const values = [
        fmtDate(record.date),
        `${record.startTime} - ${record.endTime}`,
        LABELS[record.status],
        record.markedAt ? time.format(record.markedAt) : '-',
        record.points === null ? '-' : `${record.points}/${record.maxPoints}`,
      ];
      let x = left;
      values.forEach((value, i) => {
        const color =
          i === 2 && (record.status === 'FALTA' || record.status === 'ATRASO') ? COLORS.alert : i === 2 && record.status === 'PRESENTE' ? COLORS.ok : COLORS.ink;
        doc.font(i === 2 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(color).text(value, x + 8, y + 6, { width: cols[i].width * width - 16 });
        x += cols[i].width * width;
      });
      doc.y = y + 20;
    });

    // Firma y pie
    if (doc.y > doc.page.height - 160) doc.addPage();
    doc.y += 50;
    const signX = left + width / 2 - 100;
    doc.moveTo(signX, doc.y).lineTo(signX + 200, doc.y).strokeColor(COLORS.muted).lineWidth(0.8).stroke();
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text(data.teacher ?? 'Docente', signX, doc.y + 6, { width: 200, align: 'center' });
    doc.text('Firma del docente', signX, doc.y + 2, { width: 200, align: 'center' });
    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Documento generado el ${dateTime.format(data.generatedAt)}.`, left, doc.page.height - 70, { width, align: 'center' });

    doc.end();
    return done;
  }
}
