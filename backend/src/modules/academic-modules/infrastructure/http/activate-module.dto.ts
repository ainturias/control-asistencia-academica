import { IsISO8601 } from 'class-validator';

export class RescheduleModuleDto {
  @IsISO8601({}, { message: 'La fecha programada no es válida' })
  scheduledFor: string;
}
