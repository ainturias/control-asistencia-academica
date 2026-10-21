import { Injectable } from '@nestjs/common';
import { Clock } from '../../../shared/application/clock.port';
import { ActiveModuleService } from '../../academic-modules/application/active-module.service';
import { ActivityLogRepository } from '../domain/activity-log.repository';

export interface ListActivitiesQuery {
  moduleId?: number;
  studentId?: number;
  date?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class ListActivitiesUseCase {
  constructor(
    private readonly repository: ActivityLogRepository,
    private readonly activeModule: ActiveModuleService,
    private readonly clock: Clock,
  ) {}

  async execute(query: ListActivitiesQuery) {
    const module = await this.activeModule.resolve(query.moduleId);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 25));
    const { items, total } = await this.repository.search({
      moduleId: module.id,
      studentId: query.studentId,
      date: query.date,
      timeZone: this.clock.timeZone,
      page,
      pageSize,
    });
    return { items, total, page, pageSize };
  }
}
