import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { AuthUser } from '../../../../shared/domain/auth-user';
import { CurrentUser, Public } from '../../../../shared/infrastructure/security/decorators';
import { LoginAdminUseCase } from '../../application/login-admin.use-case';
import { LoginStudentUseCase } from '../../application/login-student.use-case';
import { GetSessionUseCase, LogoutUseCase } from '../../application/session.use-cases';
import { AdminLoginDto, StudentLoginDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginAdmin: LoginAdminUseCase,
    private readonly loginStudent: LoginStudentUseCase,
    private readonly getSession: GetSessionUseCase,
    private readonly logout: LogoutUseCase,
  ) {}

  @Public()
  @Post('admin/login')
  @HttpCode(200)
  adminLogin(@Body() body: AdminLoginDto) {
    return this.loginAdmin.execute(body.email, body.password);
  }

  @Public()
  @Post('student/login')
  @HttpCode(200)
  studentLogin(@Body() body: StudentLoginDto) {
    return this.loginStudent.execute(body.identifier);
  }

  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    return { user: await this.getSession.execute(user) };
  }

  @Post('logout')
  @HttpCode(204)
  async signOut(@CurrentUser() user: AuthUser) {
    await this.logout.execute(user);
  }
}
