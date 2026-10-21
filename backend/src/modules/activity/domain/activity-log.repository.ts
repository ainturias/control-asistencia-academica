import type { ActivityLog, ActivitySearchCriteria, NewActivityLog } from './activity-log';

export abstract class ActivityLogRepository {
  abstract save(log: NewActivityLog): Promise<void>;
  abstract search(
    criteria: ActivitySearchCriteria,
  ): Promise<{ items: ActivityLog[]; total: number }>;
}
