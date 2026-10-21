import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { Notifier } from './application/notifier.service';
import { NotificationRepository } from './domain/notification.repository';
import { NotificationsController } from './infrastructure/http/notifications.controller';
import { NotificationOrmEntity, NotificationSeenOrmEntity } from './infrastructure/persistence/notification.orm-entity';
import { TypeormNotificationRepository } from './infrastructure/persistence/typeorm-notification.repository';

/** Notificaciones guardadas por módulo para el admin y los estudiantes. */
@Module({
  imports: [TypeOrmModule.forFeature([NotificationOrmEntity, NotificationSeenOrmEntity]), AcademicModulesModule],
  controllers: [NotificationsController],
  providers: [{ provide: NotificationRepository, useClass: TypeormNotificationRepository }, Notifier],
  exports: [Notifier],
})
export class NotificationsModule {}
