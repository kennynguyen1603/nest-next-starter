import { SessionService } from './session.service';
import { SessionRepository } from './infrastructure/persistence/session.repository';
import { Session } from './domain/session';

describe('SessionService', () => {
  const repository = { findById: jest.fn() };
  const service = new SessionService(
    repository as unknown as SessionRepository,
  );

  const session = (overrides: Partial<Session> = {}) =>
    ({ id: 's1', user: { id: 'u1' }, ...overrides }) as Session;

  beforeEach(() => jest.clearAllMocks());

  describe('isActiveForUser', () => {
    it('returns true for a live session owned by the user', async () => {
      repository.findById.mockResolvedValue(session());
      await expect(service.isActiveForUser('s1', 'u1')).resolves.toBe(true);
      expect(repository.findById).toHaveBeenCalledWith('s1');
    });

    it('matches ids across number/string representations', async () => {
      repository.findById.mockResolvedValue(
        session({ user: { id: 7 } as any }),
      );
      await expect(service.isActiveForUser('s1', '7')).resolves.toBe(true);
    });

    it('returns false when the session does not exist', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.isActiveForUser('s1', 'u1')).resolves.toBe(false);
    });

    it('returns false when the session has been revoked', async () => {
      repository.findById.mockResolvedValue(
        session({ revokeAt: new Date(), revokeReason: 'logout' }),
      );
      await expect(service.isActiveForUser('s1', 'u1')).resolves.toBe(false);
    });

    it('returns false when the session belongs to another user', async () => {
      repository.findById.mockResolvedValue(session());
      await expect(service.isActiveForUser('s1', 'u2')).resolves.toBe(false);
    });
  });
});
