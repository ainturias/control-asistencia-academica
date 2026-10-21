import type { NotificationFeed } from './notification'

export interface NotificationRepository {
  feed(moduleId?: number): Promise<NotificationFeed>
  markSeen(moduleId?: number): Promise<void>
}
