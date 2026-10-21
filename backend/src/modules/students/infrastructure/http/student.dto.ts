import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class StudentDto {
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

export class StudentStatusDto {
  @IsBoolean()
  active: boolean;
}
