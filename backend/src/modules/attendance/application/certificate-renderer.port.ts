import type { ExtraField } from '../../../shared/domain/extra-fields';
import type { AttendanceSummary } from '../domain/attendance-summary';
import type { AttendanceRecordView } from './attendance-record.view';

/** Todo lo que lleva la constancia de asistencia de un estudiante. */
export interface CertificateData {
  module: { name: string; firstDate: string | null; lastDate: string | null; minAttendance: number };
  teacher: string | null;
  student: { fullName: string; registrationNumber: string; email: string; extra: Record<string, string> };
  extraFields: ExtraField[];
  records: AttendanceRecordView[];
  summary: AttendanceSummary;
  generatedAt: Date;
  timeZone: string;
}

/** Puerto de salida: genera el documento (PDF) de la constancia. */
export abstract class CertificateRenderer {
  abstract render(data: CertificateData): Promise<Buffer>;
}
