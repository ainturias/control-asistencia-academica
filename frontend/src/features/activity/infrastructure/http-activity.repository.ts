import { http } from '../../../core/http/http-client'
import type { ActivityFilters, ActivityPage } from '../domain/activity'
import type { ActivityRepository } from '../domain/activity.repository'

export class HttpActivityRepository implements ActivityRepository {
  async list(filters: ActivityFilters) {
    const { data } = await http.get<ActivityPage>('/activity', { params: filters })
    return data
  }
}
