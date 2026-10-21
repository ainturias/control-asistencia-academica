import { http } from '../../../core/http/http-client'
import type { NotificationFeed } from '../domain/notification'
import type { NotificationRepository } from '../domain/notification.repository'

export class HttpNotificationRepository implements NotificationRepository {
  async feed(moduleId?: number) {
    const { data } = await http.get<NotificationFeed>('/notifications', { params: { moduleId } })
    return data
  }

  async markSeen(moduleId?: number) {
    await http.post('/notifications/seen', null, { params: { moduleId } })
  }
}
