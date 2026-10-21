import { IsBoolean, IsInt, Max, Min } from 'class-validator';

export class AttendanceRulesDto {
  @IsBoolean()
  enabled: boolean;

  @IsInt()
  @Min(0)
  @Max(180, { message: 'La apertura anticipada no puede superar 180 minutos' })
  openBeforeMinutes: number;

  @IsInt()
  @Min(0)
  @Max(240, { message: 'La tolerancia no puede superar 240 minutos' })
  toleranceMinutes: number;

  @IsInt()
  @Min(1, { message: 'El límite de atraso debe ser de al menos 1 minuto' })
  @Max(480, { message: 'El límite de atraso no puede superar 480 minutos' })
  lateLimitMinutes: number;

  @IsInt()
  @Min(1, { message: 'Un Presente debe valer al menos 1 punto' })
  @Max(100)
  presentPoints: number;

  @IsInt()
  @Min(0)
  @Max(100)
  latePoints: number;

  @IsInt()
  @Min(0)
  @Max(100, { message: 'El mínimo de asistencia debe estar entre 0 y 100' })
  minAttendancePercentage: number;

  @IsInt()
  @Min(0)
  @Max(30, { message: 'El plazo para justificar puede ser de hasta 30 días' })
  justificationDays: number;

  @IsBoolean()
  requireClassCode: boolean;

  @IsBoolean()
  classHoursOnly: boolean;
}
