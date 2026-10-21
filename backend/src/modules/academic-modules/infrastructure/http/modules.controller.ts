import {
  Body,
  Controller,
  Get,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import { ActivateModuleUseCase } from '../../application/activate-module.use-case';
import { ActiveModuleService } from '../../application/active-module.service';
import { ModuleHistoryService } from '../../application/module-history.use-cases';
import { PreviewModuleImportUseCase } from '../../application/preview-module-import.use-case';
import { UpdateAttendanceRulesUseCase } from '../../application/update-attendance-rules.use-case';
import { RescheduleModuleDto } from './activate-module.dto';
import { ActivateModuleDto, ExtraFieldsDto, ImportDraftDto } from './import-draft.dto';
import { validateDraft } from '../../application/preview-module-import.use-case';
import { UpdateExtraFieldsUseCase } from '../../application/update-extra-fields.use-case';
import { AttendanceRulesDto } from './attendance-rules.dto';

interface UploadedFile {
  buffer: Buffer;
}

interface ImportUpload {
  students?: UploadedFile[];
  sessions?: UploadedFile[];
}

const importFiles = () =>
  FileFieldsInterceptor(
    [
      { name: 'students', maxCount: 1 },
      { name: 'sessions', maxCount: 1 },
    ],
    { limits: { fileSize: 5 * 1024 * 1024 } },
  );

@Controller('modules')
@Roles('ADMIN')
export class ModulesController {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly previewImport: PreviewModuleImportUseCase,
    private readonly activateModule: ActivateModuleUseCase,
    private readonly updateRules: UpdateAttendanceRulesUseCase,
    private readonly history: ModuleHistoryService,
    private readonly updateExtraFields: UpdateExtraFieldsUseCase,
  ) {}

  @Get()
  list() {
    return this.history.list();
  }

  @Get('active')
  async active() {
    return { module: await this.activeModule.getActiveSummary() };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return { module: await this.history.get(id) };
  }

  @Patch(':id/schedule')
  async reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RescheduleModuleDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return { module: await this.history.reschedule(admin, id, new Date(body.scheduledFor)) };
  }

  @Post(':id/activate-now')
  async activateNow(@Param('id', ParseIntPipe) id: number, @CurrentUser() admin: AuthUser) {
    return { module: await this.history.activateNow(admin, id) };
  }

  @Delete(':id/schedule')
  async cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() admin: AuthUser) {
    return { module: await this.history.cancel(admin, id) };
  }

  @Patch('active/rules')
  async rules(@Body() body: AttendanceRulesDto, @CurrentUser() admin: AuthUser) {
    return { module: await this.updateRules.execute(admin, body) };
  }

  @Post('preview')
  @HttpCode(200)
  @UseInterceptors(importFiles())
  preview(@UploadedFiles() files: ImportUpload = {}) {
    return this.previewImport.execute({
      students: files.students?.[0]?.buffer,
      sessions: files.sessions?.[0]?.buffer,
    });
  }

  /** Revalida la vista previa después de que el admin corrige filas a mano. */
  @Post('validate')
  @HttpCode(200)
  validate(@Body() body: ImportDraftDto) {
    const { valid, errors } = validateDraft(body);
    return { valid, errors };
  }

  @Post('activate')
  async activate(@Body() body: ActivateModuleDto, @CurrentUser() admin: AuthUser) {
    const module = await this.activateModule.execute({
      name: body.name,
      confirm: body.confirm,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      draft: { students: body.students, sessions: body.sessions },
      extraFields: body.extraFields,
      admin,
    });
    return { module };
  }

  @Patch('active/extra-fields')
  async extraFields(@Body() body: ExtraFieldsDto, @CurrentUser() admin: AuthUser) {
    return { module: await this.updateExtraFields.execute(admin, body.fields) };
  }
}
