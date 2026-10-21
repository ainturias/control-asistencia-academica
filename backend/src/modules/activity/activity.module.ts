import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { ActivityRecorder } from './application/activity-recorder.service';
import { ListActivitiesUseCase } from './application/list-activities.use-case';
import { ActivityLogRepository } from './domain/activity-log.repository';
import { ActivityController } from './infrastructure/http/activity.controller';
import { ActivityLogOrmEntity } from './infrastructure/persistence/activity-log.orm-entity';
import { TypeormActivityLogRepository } from './infrastructure/persistence/typeorm-activity-log.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityLogOrmEntity]), AcademicModulesModule],
  controllers: [ActivityController],
  providers: [
    { provide: ActivityLogRepository, useClass: TypeormActivityLogRepository },
    ActivityRecorder,
    ListActivitiesUseCase,
  ],
  exports: [ActivityRecorder],
})
export class ActivityModule {}
