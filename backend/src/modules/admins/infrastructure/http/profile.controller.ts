import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import { AdminProfileService, MAX_PHOTO_BYTES } from '../../application/admin-profile.use-cases';
import { ChangePasswordDto, UpdateProfileDto } from './profile.dto';
import { ChangePasswordUseCase } from '../../application/change-password.use-case';

/** Perfil del docente (el administrador que ingresó). */
@Controller('profile')
@Roles('ADMIN')
export class ProfileController {
  constructor(
    private readonly profiles: AdminProfileService,
    private readonly changePassword: ChangePasswordUseCase,
  ) {}

  @Get()
  get(@CurrentUser() admin: AuthUser) {
    return this.profiles.get(admin.id);
  }

  @Put()
  update(@CurrentUser() admin: AuthUser, @Body() body: UpdateProfileDto) {
    return this.profiles.update(admin.id, {
      fullName: body.fullName,
      title: body.title ?? null,
      phone: body.phone ?? null,
      specialty: body.specialty ?? null,
      bio: body.bio ?? null,
    });
  }

  @Put('password')
  @HttpCode(204)
  async password(@CurrentUser() admin: AuthUser, @Body() body: ChangePasswordDto) {
    await this.changePassword.execute(admin, body.currentPassword, body.newPassword);
  }

  @Get('photo')
  async photo(@CurrentUser() admin: AuthUser) {
    const photo = await this.profiles.getPhoto(admin.id);
    return new StreamableFile(photo.data, { type: photo.mimeType });
  }

  @Post('photo')
  // Se deja pasar algo más del límite para responder con un mensaje claro desde el caso de uso.
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: MAX_PHOTO_BYTES + 1 } }))
  uploadPhoto(@CurrentUser() admin: AuthUser, @UploadedFile() file?: { buffer: Buffer; mimetype: string }) {
    return this.profiles.setPhoto(admin.id, file);
  }

  @Delete('photo')
  removePhoto(@CurrentUser() admin: AuthUser) {
    return this.profiles.removePhoto(admin.id);
  }
}
