import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';
import { ActivityModule } from '../activity/activity.module';
import { ListStudentsUseCase } from './application/list-students.use-case';
import { ManageStudentsService } from './application/manage-students.service';
import { StudentRepository } from './domain/student.repository';
import { StudentsController } from './infrastructure/http/students.controller';
import { StudentOrmEntity } from './infrastructure/persistence/student.orm-entity';
import { TypeormStudentRepository } from './infrastructure/persistence/typeorm-student.repository';

@Module({
  imports: [TypeOrmModule.forFeature([StudentOrmEntity]), AcademicModulesModule, ActivityModule],
  controllers: [StudentsController],
  providers: [
    { provide: StudentRepository, useClass: TypeormStudentRepository },
    ListStudentsUseCase,
    ManageStudentsService,
  ],
  exports: [StudentRepository],
})
export class StudentsModule {}
