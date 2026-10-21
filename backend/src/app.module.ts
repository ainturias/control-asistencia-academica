import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AcademicModulesModule } from './modules/academic-modules/academic-modules.module';
import { ModuleManagementModule } from './modules/academic-modules/module-management.module';
import { ActivityModule } from './modules/activity/activity.module';
import { AdminsModule } from './modules/admins/admins.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { JustificationsModule } from './modules/justifications/justifications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ClassSessionsModule } from './modules/class-sessions/class-sessions.module';
import { StudentsModule } from './modules/students/students.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SharedModule,
    AdminsModule,
    AuthModule,
    AcademicModulesModule,
    ModuleManagementModule,
    StudentsModule,
    ClassSessionsModule,
    AttendanceModule,
    ActivityModule,
    JustificationsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
