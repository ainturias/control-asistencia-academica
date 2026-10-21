import { Body, Controller, Get, Param, ParseBoolPipe, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import { ListStudentsUseCase } from '../../application/list-students.use-case';
import { ManageStudentsService } from '../../application/manage-students.service';
import { StudentDto, StudentStatusDto } from './student.dto';

@Controller('students')
@Roles('ADMIN')
export class StudentsController {
  constructor(
    private readonly listStudents: ListStudentsUseCase,
    private readonly manage: ManageStudentsService,
  ) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number,
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean,
  ) {
    return this.listStudents.execute(search, moduleId, includeInactive ?? false);
  }

  @Post()
  create(@CurrentUser() admin: AuthUser, @Body() body: StudentDto) {
    return this.manage.create(admin, body);
  }

  @Patch(':id')
  update(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: StudentDto) {
    return this.manage.update(admin, id, body);
  }

  @Patch(':id/status')
  setStatus(@CurrentUser() admin: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: StudentStatusDto) {
    return this.manage.setActive(admin, id, body.active);
  }
}
