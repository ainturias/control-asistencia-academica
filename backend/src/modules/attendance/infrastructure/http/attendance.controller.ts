import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Roles } from '../../../../shared/infrastructure/security/decorators';
import { ExportAttendanceUseCase } from '../../application/export-attendance.use-case';
import { GetAttendanceOverviewUseCase } from '../../application/get-attendance-overview.use-case';
import { GetCertificateUseCase } from '../../application/get-certificate.use-case';
import { GetMyAttendanceUseCase } from '../../application/get-my-attendance.use-case';
import { GetStudentAttendanceUseCase } from '../../application/get-student-attendance.use-case';
import { MarkAttendanceUseCase } from '../../application/mark-attendance.use-case';
import { UpdateAttendanceUseCase } from '../../application/update-attendance.use-case';
import { AttendanceOverviewQueryDto, MarkAttendanceDto, UpdateAttendanceDto } from './attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly getMyAttendance: GetMyAttendanceUseCase,
    private readonly markAttendance: MarkAttendanceUseCase,
    private readonly getOverview: GetAttendanceOverviewUseCase,
    private readonly updateAttendance: UpdateAttendanceUseCase,
    private readonly exportAttendance: ExportAttendanceUseCase,
    private readonly getStudentAttendance: GetStudentAttendanceUseCase,
    private readonly certificates: GetCertificateUseCase,
  ) {}

  @Get('me')
  @Roles('STUDENT')
  me(@CurrentUser() user: AuthUser) {
    return this.getMyAttendance.execute(user);
  }

  @Get('me/certificate')
  @Roles('STUDENT')
  async myCertificate(@CurrentUser() user: AuthUser) {
    return pdf(await this.certificates.forStudent(user));
  }

  @Get('students/:studentId/certificate')
  @Roles('ADMIN')
  async certificate(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number,
  ) {
    return pdf(await this.certificates.forAdmin(studentId, moduleId));
  }

  @Post('mark')
  @HttpCode(201)
  @Roles('STUDENT')
  mark(@CurrentUser() user: AuthUser, @Body() body: MarkAttendanceDto) {
    return this.markAttendance.execute(user, body.code);
  }

  @Get()
  @Roles('ADMIN')
  overview(@Query() query: AttendanceOverviewQueryDto) {
    return this.getOverview.execute(query);
  }

  @Get('students/:studentId')
  @Roles('ADMIN')
  student(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number,
  ) {
    return this.getStudentAttendance.execute(studentId, moduleId);
  }

  @Patch()
  @Roles('ADMIN')
  update(@CurrentUser() admin: AuthUser, @Body() body: UpdateAttendanceDto) {
    return this.updateAttendance.execute(admin, body);
  }

  @Get('export')
  @Roles('ADMIN')
  async export(
    @CurrentUser() admin: AuthUser,
    @Query('moduleId', new ParseIntPipe({ optional: true })) moduleId?: number,
  ) {
    const { file, fileName } = await this.exportAttendance.execute(admin, moduleId);
    return new StreamableFile(file, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}

const pdf = ({ file, fileName }: { file: Buffer; fileName: string }) =>
  new StreamableFile(file, { type: 'application/pdf', disposition: `attachment; filename="${fileName}"` });
