import type { AttendanceOverview } from './get-attendance-overview.use-case';

export abstract class AttendanceExporter {
  abstract export(overview: AttendanceOverview): Promise<Buffer>;
}
