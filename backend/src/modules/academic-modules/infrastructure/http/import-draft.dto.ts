import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** Las reglas de negocio (obligatorios, duplicados, formatos) se validan en el dominio y se informan por fila. */
export class StudentDraftDto {
  @IsString()
  @MaxLength(300)
  registrationNumber: string;

  @IsString()
  @MaxLength(300)
  fullName: string;

  @IsString()
  @MaxLength(300)
  email: string;

  @IsOptional()
  @IsObject()
  extra?: Record<string, string>;
}

export class SessionDraftDto {
  @IsString()
  @MaxLength(40)
  date: string;

  @IsString()
  @MaxLength(20)
  startTime: string;

  @IsString()
  @MaxLength(20)
  endTime: string;
}

export class ImportDraftDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => StudentDraftDto)
  students: StudentDraftDto[];

  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => SessionDraftDto)
  sessions: SessionDraftDto[];
}

export class ExtraFieldDto {
  @IsString()
  @MaxLength(40)
  key: string;

  @IsString()
  @MaxLength(60)
  label: string;

  @IsBoolean()
  visibleToStudent: boolean;
}

export class ExtraFieldsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExtraFieldDto)
  fields: ExtraFieldDto[];
}

export class ActivateModuleDto extends ImportDraftDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del módulo es obligatorio' })
  @MaxLength(150)
  name: string;

  @IsBoolean()
  confirm: boolean;

  /** Fecha y hora ISO de activación programada; vacía = activar ahora. */
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : value))
  @IsISO8601({}, { message: 'La fecha programada no es válida' })
  scheduledFor?: string;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ExtraFieldDto)
  extraFields: ExtraFieldDto[];
}
