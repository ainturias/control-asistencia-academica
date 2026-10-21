import type { Role } from '../../../shared/domain/auth-user';
import type { NewNotification, Notification } from './notification';

export interface FeedQuery {
  moduleId: number;
  audience: Role;
  /** Para estudiantes: incluye las dirigidas a todos y las propias. */
  studentId?: number;
  limit: number;
}

export abstract class NotificationRepository {
  abstract create(notification: NewNotification, now: Date): Promise<void>;
  abstract feed(query: FeedQuery): Promise<Notification[]>;
  abstract countSince(query: Omit<FeedQuery, 'limit'>, since: Date | null): Promise<number>;
  abstract lastSeen(role: Role, userId: number, moduleId: number): Promise<Date | null>;
  abstract markSeen(role: Role, userId: number, moduleId: number, at: Date): Promise<void>;
}
