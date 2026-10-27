import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { SessionService } from '@/session/session.service';
import { JwtPayloadType } from './types/jwt-payload.type';
import { RoleEnum } from '@/roles/roles.enum';

describe('JwtStrategy', () => {
  const sessionService = { isActiveForUser: jest.fn() };
  const configService = { getOrThrow: jest.fn().mockReturnValue('secret') };
  const strategy = new JwtStrategy(
    configService as unknown as ConfigService,
    sessionService as unknown as SessionService,
  );

  const payload: JwtPayloadType = {
    id: 'user-id',
    roles: [RoleEnum.USER],
    permissions: [],
    sessionId: 'session-id',
    iat: 0,
    exp: 9999999999,
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns the payload when its session is active', async () => {
    sessionService.isActiveForUser.mockResolvedValue(true);
    await expect(strategy.validate(payload)).resolves.toEqual(payload);
    expect(sessionService.isActiveForUser).toHaveBeenCalledWith(
      'session-id',
      'user-id',
    );
  });

  it('rejects a revoked or foreign session', async () => {
    sessionService.isActiveForUser.mockResolvedValue(false);
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([
    ['id', { ...payload, id: '' }],
    ['sessionId', { ...payload, sessionId: '' }],
  ])('rejects a payload without %s', async (_, invalid) => {
    await expect(
      strategy.validate(invalid as JwtPayloadType),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(sessionService.isActiveForUser).not.toHaveBeenCalled();
  });
});
