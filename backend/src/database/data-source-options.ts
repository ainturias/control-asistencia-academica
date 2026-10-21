import type { DataSourceOptions } from 'typeorm';
import { AcademicModuleOrmEntity } from '../modules/academic-modules/infrastructure/persistence/academic-module.orm-entity';
import { ActivityLogOrmEntity } from '../modules/activity/infrastructure/persistence/activity-log.orm-entity';
import { AdminOrmEntity } from '../modules/admins/infrastructure/persistence/admin.orm-entity';
import { AttendanceChangeOrmEntity } from '../modules/attendance/infrastructure/persistence/attendance-change.orm-entity';
import { AttendanceOrmEntity } from '../modules/attendance/infrastructure/persistence/attendance.orm-entity';
import { ClassSessionOrmEntity } from '../modules/class-sessions/infrastructure/persistence/class-session.orm-entity';
import {
  SessionChangeFileOrmEntity,
  SessionChangeOrmEntity,
} from '../modules/class-sessions/infrastructure/persistence/session-change.orm-entity';
import {
  JustificationFileOrmEntity,
  JustificationOrmEntity,
} from '../modules/justifications/infrastructure/persistence/justification.orm-entity';
import {
  NotificationOrmEntity,
  NotificationSeenOrmEntity,
} from '../modules/notifications/infrastructure/persistence/notification.orm-entity';
import { StudentOrmEntity } from '../modules/students/infrastructure/persistence/student.orm-entity';
import { InitialSchema1760400000000 } from './migrations/1760400000000-initial-schema';
import { AttendanceRulesAndProfile1760500000000 } from './migrations/1760500000000-attendance-rules-and-profile';
import { AttendanceScoring1760600000000 } from './migrations/1760600000000-attendance-scoring';
import { ModuleScheduling1760700000000 } from './migrations/1760700000000-module-scheduling';
import { StudentEditingExtraFields1760800000000 } from './migrations/1760800000000-student-editing-extra-fields';
import { Justifications1760900000000 } from './migrations/1760900000000-justifications';
import { JustificationDays1761000000000 } from './migrations/1761000000000-justification-days';
import { ClassChangesAndCode1761100000000 } from './migrations/1761100000000-class-changes-and-code';
import { Notifications1761200000000 } from './migrations/1761200000000-notifications';
import { ClassHoursOnly1761300000000 } from './migrations/1761300000000-class-hours-only';

export const ORM_ENTITIES = [
  AdminOrmEntity,
  AcademicModuleOrmEntity,
  StudentOrmEntity,
  ClassSessionOrmEntity,
  AttendanceOrmEntity,
  AttendanceChangeOrmEntity,
  ActivityLogOrmEntity,
  JustificationOrmEntity,
  JustificationFileOrmEntity,
  SessionChangeOrmEntity,
  SessionChangeFileOrmEntity,
  NotificationOrmEntity,
  NotificationSeenOrmEntity,
];

export function buildDataSourceOptions(
  env: (key: string) => string | undefined,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: env('DB_HOST') ?? 'localhost',
    port: Number(env('DB_PORT') ?? 5432),
    username: env('DB_USER') ?? 'postgres',
    password: env('DB_PASSWORD'),
    database: env('DB_NAME') ?? 'modulo2',
    entities: ORM_ENTITIES,
    migrations: [
      InitialSchema1760400000000,
      AttendanceRulesAndProfile1760500000000,
      AttendanceScoring1760600000000,
      ModuleScheduling1760700000000,
      StudentEditingExtraFields1760800000000,
      Justifications1760900000000,
      JustificationDays1761000000000,
      ClassChangesAndCode1761100000000,
      Notifications1761200000000,
      ClassHoursOnly1761300000000,
    ],
    synchronize: false,
  };
}
