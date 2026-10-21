import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { ActivityModule } from '../activity/activity.module';
import { ClassSessionsModule } from '../class-sessions/class-sessions.module';
import { StudentsModule } from '../students/students.module';
import { AdminsModule } from '../admins/admins.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceExporter } from './application/attendance-exporter.port';
import { CertificateRenderer } from './application/certificate-renderer.port';
import { GetCertificateUseCase } from './application/get-certificate.use-case';
import { PdfkitCertificateRenderer } from './infrastructure/pdf/pdfkit-certificate.renderer';
import { ExportAttendanceUseCase } from './application/export-attendance.use-case';
import { GetAttendanceOverviewUseCase } from './application/get-attendance-overview.use-case';
import { GetMyAttendanceUseCase } from './application/get-my-attendance.use-case';
import { GetStudentAttendanceUseCase } from './application/get-student-attendance.use-case';
import { MarkAttendanceUseCase } from './application/mark-attendance.use-case';
import { StudentContextService } from './application/student-context.service';
import { StudentHistoryService } from './application/student-history.service';
import { UpdateAttendanceUseCase } from './application/update-attendance.use-case';
import { AttendanceRepository } from './domain/attendance.repository';
import { ExcelAttendanceExporter } from './infrastructure/excel/excel-attendance.exporter';
import { AttendanceController } from './infrastructure/http/attendance.controller';
import { AttendanceChangeOrmEntity } from './infrastructure/persistence/attendance-change.orm-entity';
import { AttendanceOrmEntity } from './infrastructure/persistence/attendance.orm-entity';
import { TypeormAttendanceRepository } from './infrastructure/persistence/typeorm-attendance.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceOrmEntity, AttendanceChangeOrmEntity]),
    AcademicModulesModule,
    StudentsModule,
    ClassSessionsModule,
    ActivityModule,
    AdminsModule,
    NotificationsModule,
  ],
  controllers: [AttendanceController],
  providers: [
    { provide: AttendanceRepository, useClass: TypeormAttendanceRepository },
    { provide: AttendanceExporter, useClass: ExcelAttendanceExporter },
    { provide: CertificateRenderer, useClass: PdfkitCertificateRenderer },
    GetCertificateUseCase,
    StudentContextService,
    StudentHistoryService,
    GetStudentAttendanceUseCase,
    MarkAttendanceUseCase,
    GetMyAttendanceUseCase,
    GetAttendanceOverviewUseCase,
    UpdateAttendanceUseCase,
    ExportAttendanceUseCase,
  ],
  exports: [AttendanceRepository, StudentContextService, StudentHistoryService, UpdateAttendanceUseCase],
})
export class AttendanceModule {}
