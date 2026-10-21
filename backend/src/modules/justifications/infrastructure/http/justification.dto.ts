import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { STORED_STATUSES, type StoredAttendanceStatus } from '../../../attendance/domain/attendance-status';

/** Llega como multipart junto con las imágenes; los números vienen como texto. */
export class SubmitJustificationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionId: number;

  @IsString()
  @MaxLength(2000)
  reason: string;
}

export class AdminJustificationDto extends SubmitJustificationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @IsIn(STORED_STATUSES)
  status: StoredAttendanceStatus;
}

export class ApproveJustificationDto {
  @IsIn(STORED_STATUSES)
  status: StoredAttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

export class RejectJustificationDto {
  @IsString()
  @MaxLength(500)
  comment: string;
}

export class ListJustificationsQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  moduleId?: number;
}
