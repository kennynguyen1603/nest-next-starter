import { Notification } from '@/notifications/domain/notification';
import { NotificationType } from '@/notifications/notifications.enum';
import { NotificationSchemaClass } from '../entities/notification.schema';

export class NotificationDocumentMapper {
  static toDomain(raw: NotificationSchemaClass): Notification {
    const domain = new Notification();
    domain.id = raw._id.toString();
    domain.userId = raw.userId;
    domain.type = raw.type as NotificationType;
    domain.title = raw.title;
    domain.message = raw.message;
    domain.data = raw.data ?? null;
    domain.isRead = raw.isRead;
    domain.readAt = raw.readAt ?? null;
    domain.createdAt = raw.createdAt;
    domain.updatedAt = raw.updatedAt;
    return domain;
  }
}
