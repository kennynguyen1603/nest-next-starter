import { Notification } from '@/notifications/domain/notification';
import { NotificationType } from '@/notifications/notifications.enum';
import { NotificationEntity } from '../entities/notification.entity';

export class NotificationMapper {
  static toDomain(raw: NotificationEntity): Notification {
    const domain = new Notification();
    domain.id = raw.id;
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

  static toPersistence(domain: Notification): NotificationEntity {
    const entity = new NotificationEntity();
    if (domain.id) entity.id = domain.id;
    entity.userId = domain.userId;
    entity.type = domain.type;
    entity.title = domain.title;
    entity.message = domain.message;
    entity.data = domain.data ?? null;
    entity.isRead = domain.isRead;
    entity.readAt = domain.readAt ?? null;
    return entity;
  }
}
