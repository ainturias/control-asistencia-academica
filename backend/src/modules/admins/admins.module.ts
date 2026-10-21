import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminProfileService } from './application/admin-profile.use-cases';
import { ChangePasswordUseCase } from './application/change-password.use-case';
import { ActivityModule } from '../activity/activity.module';
import { EnsureDefaultAdminUseCase } from './application/ensure-default-admin.use-case';
import { PasswordHasher } from './application/password-hasher.port';
import { AdminRepository } from './domain/admin.repository';
import { DefaultAdminSeeder } from './infrastructure/default-admin.seeder';
import { ProfileController } from './infrastructure/http/profile.controller';
import { TeacherController } from './infrastructure/http/teacher.controller';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { AdminOrmEntity } from './infrastructure/persistence/admin.orm-entity';
import { TypeormAdminRepository } from './infrastructure/persistence/typeorm-admin.repository';
import { BcryptPasswordHasher } from './infrastructure/security/bcrypt-password.hasher';

@Module({
  imports: [TypeOrmModule.forFeature([AdminOrmEntity]), AcademicModulesModule, ActivityModule],
  controllers: [ProfileController, TeacherController],
  providers: [
    { provide: AdminRepository, useClass: TypeormAdminRepository },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    EnsureDefaultAdminUseCase,
    DefaultAdminSeeder,
    AdminProfileService,
    ChangePasswordUseCase,
  ],
  exports: [AdminRepository, PasswordHasher],
})
export class AdminsModule {}
