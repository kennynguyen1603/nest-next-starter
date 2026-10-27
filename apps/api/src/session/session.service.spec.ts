import { SessionService } from './session.service';
import { SessionRepository } from './infrastructure/persistence/session.repository';
import { Session } from './domain/session';

describe('SessionService', () => {
  const repository = {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateByHash: jest.fn(),
    deleteById: jest.fn(),
    deleteByUserId: jest.fn(),
    deleteByUserIdWithExclude: jest.fn(),
    enforceSessionLimit: jest.fn(),
  };
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

  describe('repository delegation', () => {
    it.each([
      ['findById', ['s1']],
      ['findByUserId', ['u1']],
      ['create', [{ hash: 'h' }]],
      ['update', ['s1', { hash: 'h' }]],
      ['updateByHash', [{ id: 's1', hash: 'h' }, { hash: 'h2' }]],
      ['deleteById', ['s1', 'logout']],
      ['deleteByUserId', [{ userId: 'u1' }, 'logout']],
      [
        'deleteByUserIdWithExclude',
        [{ userId: 'u1', excludeSessionId: 's1' }, 'logout'],
      ],
      ['enforceSessionLimit', ['u1', 5]],
    ] as const)(
      '%s forwards its arguments and result',
      async (method, args) => {
        repository[method].mockResolvedValue('result');

        await expect(
          (service[method] as (...a: unknown[]) => Promise<unknown>)(...args),
        ).resolves.toBe('result');
        expect(repository[method]).toHaveBeenCalledWith(...args);
      },
    );
  });
});
