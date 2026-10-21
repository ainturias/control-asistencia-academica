import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../../../shared/infrastructure/security/decorators';
import { ListActivitiesUseCase } from '../../application/list-activities.use-case';
import { ListActivitiesQueryDto } from './list-activities.query';

@Controller('activity')
@Roles('ADMIN')
export class ActivityController {
  constructor(private readonly listActivities: ListActivitiesUseCase) {}

  @Get()
  list(@Query() query: ListActivitiesQueryDto) {
    return this.listActivities.execute(query);
  }
}
