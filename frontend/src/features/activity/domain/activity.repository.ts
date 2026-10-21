import type { ActivityFilters, ActivityPage } from './activity'

export interface ActivityRepository {
  list(filters: ActivityFilters): Promise<ActivityPage>
}
