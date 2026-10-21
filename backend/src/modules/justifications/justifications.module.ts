import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { ClassSessionsModule } from '../class-sessions/class-sessions.module';
import { StudentsModule } from '../students/students.module';
import { JustificationsService } from './application/justifications.service';
import { JustificationRepository } from './domain/justification.repository';
import { JustificationsController } from './infrastructure/http/justifications.controller';
import {
  JustificationFileOrmEntity,
  JustificationOrmEntity,
} from './infrastructure/persistence/justification.orm-entity';
import { TypeormJustificationRepository } from './infrastructure/persistence/typeorm-justification.repository';

/** Justificaciones de inasistencia con imágenes de respaldo (casos especiales). */
@Module({
  imports: [
    TypeOrmModule.forFeature([JustificationOrmEntity, JustificationFileOrmEntity]),
    AcademicModulesModule,
    AttendanceModule,
    StudentsModule,
    ClassSessionsModule,
    ActivityModule,
    NotificationsModule,
  ],
  controllers: [JustificationsController],
  providers: [{ provide: JustificationRepository, useClass: TypeormJustificationRepository }, JustificationsService],
})
export class JustificationsModule {}
