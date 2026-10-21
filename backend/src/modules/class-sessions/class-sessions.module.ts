import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ListSessionsUseCase } from './application/list-sessions.use-case';
import { SessionManagementService } from './application/session-management.service';
import {
  SessionChangeFileOrmEntity,
  SessionChangeOrmEntity,
} from './infrastructure/persistence/session-change.orm-entity';
import { ClassSessionRepository } from './domain/class-session.repository';
import { SessionsController } from './infrastructure/http/sessions.controller';
import { ClassSessionOrmEntity } from './infrastructure/persistence/class-session.orm-entity';
import { TypeormClassSessionRepository } from './infrastructure/persistence/typeorm-class-session.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassSessionOrmEntity, SessionChangeOrmEntity, SessionChangeFileOrmEntity]),
    AcademicModulesModule,
    ActivityModule,
    NotificationsModule,
  ],
  controllers: [SessionsController],
  providers: [
    { provide: ClassSessionRepository, useClass: TypeormClassSessionRepository },
    ListSessionsUseCase,
    SessionManagementService,
  ],
  exports: [ClassSessionRepository],
})
export class ClassSessionsModule {}
