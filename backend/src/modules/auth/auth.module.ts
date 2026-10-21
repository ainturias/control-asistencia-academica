import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { RolesGuard } from '../../shared/infrastructure/security/roles.guard';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { ActivityModule } from '../activity/activity.module';
import { AdminsModule } from '../admins/admins.module';
import { StudentsModule } from '../students/students.module';
import { LoginAdminUseCase } from './application/login-admin.use-case';
import { LoginStudentUseCase } from './application/login-student.use-case';
import { GetSessionUseCase, LogoutUseCase } from './application/session.use-cases';
import { TokenService } from './application/token-service.port';
import { AuthController } from './infrastructure/http/auth.controller';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';
import { RealtimeGateway } from './infrastructure/realtime/realtime.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
    }),
    AdminsModule,
    StudentsModule,
    AcademicModulesModule,
    ActivityModule,
  ],
  controllers: [AuthController],
  providers: [
    { provide: TokenService, useClass: JwtTokenService },
    // El orden importa: primero autenticación, luego roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    LoginAdminUseCase,
    LoginStudentUseCase,
    GetSessionUseCase,
    LogoutUseCase,
    RealtimeGateway,
  ],
})
export class AuthModule {}
