import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import type { UploadedImage } from '../../../justifications/domain/justification';
import { MAX_JUSTIFICATION_FILE_BYTES } from '../../../justifications/domain/justification-policy';
import { ListSessionsUseCase } from '../../application/list-sessions.use-case';
import { SessionManagementService } from '../../application/session-management.service';
import { MAX_CHANGE_PHOTOS } from '../../domain/session-change';
import { ClassCodeDto, SessionChangeDto, SessionDataDto } from './session.dto';

const photos = () =>
  FilesInterceptor('files', MAX_CHANGE_PHOTOS + 1, { limits: { fileSize: MAX_JUSTIFICATION_FILE_BYTES + 1 } });

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly listSessions: ListSessionsUseCase,
    private readonly management: SessionManagementService,
  ) {}

  @Get()
  @Roles('ADMIN')
  list(@Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number) {
    return this.listSessions.execute(moduleId);
  }

  /** Historial de cambios de clases (también lo ven los estudiantes de su módulo). */
  @Get('changes')
  @Roles('ADMIN', 'STUDENT')
  changes(@CurrentUser() user: AuthUser, @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number) {
    return this.management.listChanges(user, moduleId);
  }

  @Get('changes/:id/files/:fileId')
  @Roles('ADMIN', 'STUDENT')
  async changeFile(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    const file = await this.management.getChangeFile(user, id, fileId);
    return new StreamableFile(file.data, { type: file.mimeType });
  }

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(photos())
  add(@CurrentUser() admin: AuthUser, @Body() body: SessionDataDto, @UploadedFiles() files: UploadedImage[] = []) {
    return this.management.add(
      admin,
      { classDate: body.date, startTime: body.startTime, endTime: body.endTime },
      { reason: body.reason, files },
    );
  }

  @Post(':id/cancel')
  @Roles('ADMIN')
  @UseInterceptors(photos())
  cancel(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SessionChangeDto,
    @UploadedFiles() files: UploadedImage[] = [],
  ) {
    return this.management.cancel(admin, id, { reason: body.reason, files });
  }

  @Post(':id/restore')
  @Roles('ADMIN')
  @UseInterceptors(photos())
  restore(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SessionChangeDto,
    @UploadedFiles() files: UploadedImage[] = [],
  ) {
    return this.management.restore(admin, id, { reason: body.reason, files });
  }

  @Post(':id/reschedule')
  @Roles('ADMIN')
  @UseInterceptors(photos())
  reschedule(
    @CurrentUser() admin: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SessionDataDto,
    @UploadedFiles() files: UploadedImage[] = [],
  ) {
    return this.management.reschedule(
      admin,
      id,
      { classDate: body.date, startTime: body.startTime, endTime: body.endTime },
      { reason: body.reason, files },
    );
  }

  @Patch(':id/code')
  @Roles('ADMIN')
  code(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: ClassCodeDto) {
    return this.management.setCode(admin, id, body.code ?? null);
  }
}
