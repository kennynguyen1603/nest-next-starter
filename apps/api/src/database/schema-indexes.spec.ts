import { NotificationSchema } from '@/notifications/infrastructure/persistence/document/entities/notification.schema';
import { SessionSchema } from '@/session/infrastructure/persistence/document/entities/session.schema';
import { UserSchema } from '@/users/infrastructure/persistence/document/entities/user.schema';

describe('document schema indexes', () => {
  it('indexes notifications for the per-user feed and unread count', () => {
    expect(NotificationSchema.indexes()).toContainEqual([
      { userId: 1, isRead: 1, createdAt: -1 },
      expect.anything(),
    ]);
  });

  it('indexes sessions by user activity and device', () => {
    const indexes = SessionSchema.indexes().map(([fields]) => fields);

    expect(indexes).toContainEqual({ user: 1, lastUsedAt: -1, createdAt: -1 });
    expect(indexes).toContainEqual({ deviceId: 1 });
  });

  it('indexes social logins only for users that have a socialId', () => {
    expect(UserSchema.indexes()).toContainEqual([
      { socialId: 1, provider: 1 },
      expect.objectContaining({
        partialFilterExpression: { socialId: { $type: 'string' } },
      }),
    ]);
  });
});
