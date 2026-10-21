import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import type { AuthUser } from '../../../shared/domain/auth-user';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import type { AcademicModule } from '../../academic-modules/domain/academic-module';
import { AdminRepository } from '../../admins/domain/admin.repository';
import type { Student } from '../../students/domain/student';
import { CertificateRenderer } from './certificate-renderer.port';
import { GetStudentAttendanceUseCase } from './get-student-attendance.use-case';
import { StudentContextService } from './student-context.service';
import { StudentHistoryService } from './student-history.service';

/** Constancia de asistencia en PDF: la descarga el admin (de cualquier módulo) o el propio estudiante. */
@Injectable()
export class GetCertificateUseCase {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly studentAttendance: GetStudentAttendanceUseCase,
    private readonly studentContext: StudentContextService,
    private readonly history: StudentHistoryService,
    private readonly admins: AdminRepository,
    private readonly renderer: CertificateRenderer,
    private readonly clock: Clock,
  ) {}

  async forAdmin(studentId: number, moduleId?: number) {
    const module = await this.activeModule.resolve(moduleId);
    const view = await this.studentAttendance.execute(studentId, moduleId);
    return this.render(module, view.student as Student, 'admin');
  }

  async forStudent(user: AuthUser) {
    const { module, student } = await this.studentContext.resolve(user);
    return this.render(module, student, 'student');
  }

  private async render(module: AcademicModule, student: Student, audience: 'admin' | 'student') {
    const view = await this.history.build(module, student, audience);
    const teacher = module.createdBy ? await this.admins.findProfile(module.createdBy) : null;
    const scheduled = view.records.filter((r) => r.status !== 'CANCELADA');
    const file = await this.renderer.render({
      module: {
        name: module.name,
        firstDate: scheduled[0]?.date ?? null,
        lastDate: scheduled[scheduled.length - 1]?.date ?? null,
        minAttendance: module.rules.minAttendancePercentage,
      },
      teacher: teacher ? [teacher.title, teacher.fullName].filter(Boolean).join(' ') : null,
      student: {
        fullName: view.student.fullName,
        registrationNumber: view.student.registrationNumber,
        email: view.student.email,
        extra: view.student.extra,
      },
      extraFields: view.extraFields,
      records: view.records,
      summary: view.summary,
      generatedAt: this.clock.now(),
      timeZone: this.clock.timeZone,
    });
    const safe = (text: string) =>
      text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').slice(0, 40);
    return { file, fileName: `constancia_${safe(view.student.fullName)}_${safe(module.name)}.pdf` };
  }
}
