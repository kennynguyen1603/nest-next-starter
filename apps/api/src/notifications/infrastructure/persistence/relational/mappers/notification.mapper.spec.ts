import { NotificationMapper } from './notification.mapper';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationType } from '@/notifications/notifications.enum';
import { Notification } from '@/notifications/domain/notification';

function makeEntity(
  overrides: Partial<NotificationEntity> = {},
): NotificationEntity {
  const e = new NotificationEntity();
  e.id = 'test-id';
  e.userId = 'user-id';
  e.type = NotificationType.SYSTEM;
  e.title = 'Hello';
  e.message = 'World';
  e.data = null;
  e.isRead = false;
  e.readAt = null;
  e.createdAt = new Date('2024-01-01');
  e.updatedAt = new Date('2024-01-01');
  return Object.assign(e, overrides);
}

describe('NotificationMapper', () => {
  describe('toDomain', () => {
    it('maps all fields from entity to domain', () => {
      const entity = makeEntity({
        isRead: true,
        readAt: new Date('2024-01-02'),
        data: { foo: 'bar' },
      });
      const domain = NotificationMapper.toDomain(entity);
      expect(domain.id).toBe('test-id');
      expect(domain.userId).toBe('user-id');
      expect(domain.type).toBe(NotificationType.SYSTEM);
      expect(domain.title).toBe('Hello');
      expect(domain.message).toBe('World');
      expect(domain.data).toEqual({ foo: 'bar' });
      expect(domain.isRead).toBe(true);
      expect(domain.readAt).toEqual(new Date('2024-01-02'));
      expect(domain.createdAt).toEqual(new Date('2024-01-01'));
    });

    it('maps null data and readAt correctly', () => {
      const entity = makeEntity();
      const domain = NotificationMapper.toDomain(entity);
      expect(domain.data).toBeNull();
      expect(domain.readAt).toBeNull();
    });
  });

  describe('toPersistence', () => {
    it('maps all fields from domain to entity', () => {
      const domain = new Notification();
      domain.id = 'test-id';
      domain.userId = 'user-id';
      domain.type = NotificationType.SYSTEM;
      domain.title = 'Hello';
      domain.message = 'World';
      domain.data = null;
      domain.isRead = false;
      domain.readAt = null;
      const entity = NotificationMapper.toPersistence(domain);
      expect(entity.id).toBe('test-id');
      expect(entity.userId).toBe('user-id');
      expect(entity.isRead).toBe(false);
      expect(entity.data).toBeNull();
    });
  });
});
