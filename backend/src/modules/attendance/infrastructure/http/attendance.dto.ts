import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { STORED_STATUSES, type StoredAttendanceStatus } from '../../domain/attendance-status';

export class UpdateAttendanceDto {
  @IsInt()
  @Min(1)
  studentId: number;

  @IsInt()
  @Min(1)
  sessionId: number;

  @IsIn(STORED_STATUSES, { message: 'El estado debe ser PRESENTE, ATRASO, FALTA o JUSTIFICADO' })
  status: StoredAttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class AttendanceOverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  moduleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sessionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}

export class MarkAttendanceDto {
  /** Código de la clase, solo si el módulo lo exige. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string;
}
