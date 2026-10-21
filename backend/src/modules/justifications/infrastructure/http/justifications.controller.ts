import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import { JustificationsService } from '../../application/justifications.service';
import type { UploadedImage } from '../../domain/justification';
import { MAX_JUSTIFICATION_FILE_BYTES, MAX_JUSTIFICATION_FILES } from '../../domain/justification-policy';
import {
  AdminJustificationDto,
  ApproveJustificationDto,
  ListJustificationsQueryDto,
  RejectJustificationDto,
  SubmitJustificationDto,
} from './justification.dto';

// Se deja pasar un poco más del límite para responder con un mensaje claro desde el dominio.
const images = () =>
  FilesInterceptor('files', MAX_JUSTIFICATION_FILES + 1, { limits: { fileSize: MAX_JUSTIFICATION_FILE_BYTES + 1 } });

@Controller('justifications')
export class JustificationsController {
  constructor(private readonly justifications: JustificationsService) {}

  @Post('mine')
  @Roles('STUDENT')
  @UseInterceptors(images())
  submit(
    @CurrentUser() user: AuthUser,
    @Body() body: SubmitJustificationDto,
    @UploadedFiles() files: UploadedImage[] = [],
  ) {
    return this.justifications.submit(user, { sessionId: body.sessionId, reason: body.reason, files });
  }

  @Get('mine')
  @Roles('STUDENT')
  mine(@CurrentUser() user: AuthUser) {
    return this.justifications.listMine(user);
  }

  @Get()
  @Roles('ADMIN')
  list(@Query() query: ListJustificationsQueryDto) {
    return this.justifications.list(query);
  }

  @Post()
  @Roles('ADMIN')
  @UseInterceptors(images())
  createByAdmin(
    @CurrentUser() admin: AuthUser,
    @Body() body: AdminJustificationDto,
    @UploadedFiles() files: UploadedImage[] = [],
  ) {
    return this.justifications.createByAdmin(admin, {
      studentId: body.studentId,
      sessionId: body.sessionId,
      status: body.status,
      reason: body.reason,
      files,
    });
  }

  @Post(':id/approve')
  @Roles('ADMIN')
  approve(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: ApproveJustificationDto) {
    return this.justifications.approve(admin, id, body);
  }

  @Post(':id/reject')
  @Roles('ADMIN')
  reject(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: RejectJustificationDto) {
    return this.justifications.reject(admin, id, body.comment);
  }

  @Get(':id/files/:fileId')
  @Roles('ADMIN', 'STUDENT')
  async file(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('fileId', ParseIntPipe) fileId: number,
  ) {
    const file = await this.justifications.getFile(user, id, fileId);
    return new StreamableFile(file.data, { type: file.mimeType });
  }
}
