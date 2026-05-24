import { Types } from 'mongoose';
import { NotificationType } from '@/notifications/notifications.enum';
import { NotificationSchemaClass } from '../entities/notification.schema';
import { NotificationDocumentMapper } from './notification.mapper';

function makeSchema(
  overrides: Partial<NotificationSchemaClass> = {},
): NotificationSchemaClass {
  const schema = new NotificationSchemaClass();
  (schema as any)._id = new Types.ObjectId('507f1f77bcf86cd799439011');
  schema.userId = 'user-objectid-string';
  schema.type = NotificationType.SYSTEM;
  schema.title = 'Test';
  schema.message = 'Body';
  schema.data = null;
  schema.isRead = false;
  schema.readAt = null;
  schema.createdAt = new Date('2026-01-01T00:00:00Z');
  schema.updatedAt = new Date('2026-01-01T00:00:00Z');
  return Object.assign(schema, overrides);
}

describe('NotificationDocumentMapper', () => {
  it('maps ObjectId _id to domain id string', () => {
    const domain = NotificationDocumentMapper.toDomain(makeSchema());
    expect(domain.id).toBe('507f1f77bcf86cd799439011');
  });

  it('maps all fields correctly', () => {
    const domain = NotificationDocumentMapper.toDomain(makeSchema());
    expect(domain.userId).toBe('user-objectid-string');
    expect(domain.type).toBe(NotificationType.SYSTEM);
    expect(domain.title).toBe('Test');
    expect(domain.message).toBe('Body');
    expect(domain.data).toBeNull();
    expect(domain.isRead).toBe(false);
    expect(domain.readAt).toBeNull();
    expect(domain.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('maps data payload when present', () => {
    const domain = NotificationDocumentMapper.toDomain(
      makeSchema({ data: { orderId: '123', link: '/orders/123' } }),
    );
    expect(domain.data).toEqual({ orderId: '123', link: '/orders/123' });
  });

  it('maps readAt when set', () => {
    const readAt = new Date('2026-02-01T00:00:00Z');
    const domain = NotificationDocumentMapper.toDomain(
      makeSchema({ isRead: true, readAt }),
    );
    expect(domain.isRead).toBe(true);
    expect(domain.readAt).toEqual(readAt);
  });
});
