import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AcademicModulesModule } from './academic-modules.module';
import { ActivateModuleUseCase } from './application/activate-module.use-case';
import { ImportFileReader } from './application/import-file-reader.port';
import { PreviewModuleImportUseCase } from './application/preview-module-import.use-case';
import { UpdateAttendanceRulesUseCase } from './application/update-attendance-rules.use-case';
import { ModuleHistoryService } from './application/module-history.use-cases';
import { UpdateExtraFieldsUseCase } from './application/update-extra-fields.use-case';
import { ScheduledActivationService } from './application/scheduled-activation.service';
import { ExcelImportFileReader } from './infrastructure/excel/excel-import-file.reader';
import { ModulesController } from './infrastructure/http/modules.controller';

/** Importación y activación de módulos (RF-11, RF-12, RF-13, RF-16). */
@Module({
  imports: [AcademicModulesModule, ActivityModule, NotificationsModule],
  controllers: [ModulesController],
  providers: [
    { provide: ImportFileReader, useClass: ExcelImportFileReader },
    PreviewModuleImportUseCase,
    ActivateModuleUseCase,
    UpdateAttendanceRulesUseCase,
    ModuleHistoryService,
    UpdateExtraFieldsUseCase,
    ScheduledActivationService,
  ],
})
export class ModuleManagementModule {}
