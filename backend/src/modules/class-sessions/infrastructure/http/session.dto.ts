import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Multipart: motivo e imágenes (las imágenes llegan aparte, en "files"). */
export class SessionChangeDto {
  @IsString()
  @MaxLength(2000)
  reason: string;
}

export class SessionDataDto extends SessionChangeDto {
  @IsString()
  @MaxLength(10)
  date: string;

  @IsString()
  @MaxLength(5)
  startTime: string;

  @IsString()
  @MaxLength(5)
  endTime: string;
}

export class ClassCodeDto {
  /** null o vacío quita el código. */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  code?: string | null;
}
