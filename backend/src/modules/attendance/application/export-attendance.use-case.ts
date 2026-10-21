import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { ActivityRecorder } from '../../activity/application/activity-recorder.service';
import { AttendanceExporter } from './attendance-exporter.port';
import { GetAttendanceOverviewUseCase } from './get-attendance-overview.use-case';

/** RF-17: exporta las asistencias del módulo activo. */
@Injectable()
export class ExportAttendanceUseCase {
  constructor(
    private readonly overview: GetAttendanceOverviewUseCase,
    private readonly exporter: AttendanceExporter,
    private readonly activity: ActivityRecorder,
  ) {}

  async execute(admin: AuthUser, moduleId?: number) {
    const overview = await this.overview.execute({ moduleId });
    const file = await this.exporter.export(overview);
    await this.activity.record({
      actor: admin,
      action: 'EXPORT_ATTENDANCE',
      moduleId: overview.module.id,
      description: `Exportó las asistencias del módulo "${overview.module.name}"`,
    });
    const safeName = overview.module.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9-]+/g, '_')
      .slice(0, 60);
    return { file, fileName: `asistencias_${safeName}_${overview.today}.xlsx` };
  }
}
