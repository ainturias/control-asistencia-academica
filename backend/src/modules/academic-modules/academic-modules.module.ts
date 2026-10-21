import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActiveModuleService } from './application/active-module.service';
import { AcademicModuleRepository } from './domain/academic-module.repository';
import { AcademicModuleOrmEntity } from './infrastructure/persistence/academic-module.orm-entity';
import { TypeormAcademicModuleRepository } from './infrastructure/persistence/typeorm-academic-module.repository';

/** Núcleo: consulta del módulo activo. Sin dependencias de otras features. */
@Module({
  imports: [TypeOrmModule.forFeature([AcademicModuleOrmEntity])],
  providers: [
    { provide: AcademicModuleRepository, useClass: TypeormAcademicModuleRepository },
    ActiveModuleService,
  ],
  exports: [AcademicModuleRepository, ActiveModuleService],
})
export class AcademicModulesModule {}
