import { Controller, Get, ParseIntPipe, Query, StreamableFile } from '@nestjs/common';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import { ActiveModuleService } from '../../../academic-modules/application/active-module.service';
import { AdminProfileService } from '../../application/admin-profile.use-cases';

/** Docente del módulo activo (el administrador que lo activó), visible también para los estudiantes. */
@Controller('teacher')
@Roles('ADMIN', 'STUDENT')
export class TeacherController {
  constructor(
    private readonly activeModule: ActiveModuleService,
    private readonly profiles: AdminProfileService,
  ) {}

  @Get()
  async get(@CurrentUser() user: AuthUser, @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number) {
    return { teacher: await this.findTeacher(user, moduleId) };
  }

  @Get('photo')
  async photo(@CurrentUser() user: AuthUser, @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number) {
    const teacher = await this.findTeacher(user, moduleId);
    if (!teacher) throw new NotFoundError('El módulo no tiene docente');
    const photo = await this.profiles.getPhoto(teacher.id);
    return new StreamableFile(photo.data, { type: photo.mimeType });
  }

  /** Los estudiantes solo ven al docente de su módulo activo; el admin, el de cualquier módulo. */
  private async findTeacher(user: AuthUser, moduleId?: number) {
    if (moduleId !== undefined && user.role !== 'ADMIN') throw new ForbiddenError('Sin acceso a otros módulos');
    const module = await this.activeModule.resolve(moduleId);
    if (!module.createdBy) return null;
    return this.profiles.get(module.createdBy).catch(() => null);
  }
}
