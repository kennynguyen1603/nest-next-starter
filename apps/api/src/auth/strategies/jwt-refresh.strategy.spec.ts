import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { REFRESH_COOKIE_NAME } from '@/auth/refresh-cookie.util';
import { JwtRefreshPayloadType } from './types/jwt-refresh-payload.type';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  const getOrThrow = jest.fn().mockReturnValue('refresh-secret');
  const configService = { getOrThrow } as unknown as ConfigService;
  const strategy = new JwtRefreshStrategy(configService);
  // passport-jwt keeps the configured extractor on the instance.
  const extract = (req: Partial<Request>) =>
    (
      strategy as unknown as {
        _jwtFromRequest: (r: Partial<Request>) => string | null;
      }
    )._jwtFromRequest(req);

  it('reads the refresh secret from config', () => {
    expect(getOrThrow).toHaveBeenCalledWith('auth.refreshSecret', {
      infer: true,
    });
  });

  describe('token extraction', () => {
    it('takes the token from the refresh cookie', () => {
      expect(extract({ cookies: { [REFRESH_COOKIE_NAME]: 'tok' } })).toBe(
        'tok',
      );
    });

    it('ignores the Authorization header', () => {
      expect(
        extract({ cookies: {}, headers: { authorization: 'Bearer tok' } }),
      ).toBeNull();
    });

    it('returns null when cookies are not parsed', () => {
      expect(extract({ headers: {} })).toBeNull();
    });
  });

  describe('validate', () => {
    it('returns the payload when it is bound to a session', () => {
      const payload = { sessionId: 's1', hash: 'h' } as JwtRefreshPayloadType;
      expect(strategy.validate(payload)).toBe(payload);
    });

    it('rejects a payload without sessionId', () => {
      expect(() =>
        strategy.validate({ hash: 'h' } as JwtRefreshPayloadType),
      ).toThrow(UnauthorizedException);
    });
  });
});
