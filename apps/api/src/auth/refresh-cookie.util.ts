import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import ms from 'ms';

import { AllConfigType } from '@/config/config.type';

export const REFRESH_COOKIE_NAME = 'refresh_token';

// Single source of truth for the refresh cookie so every login flow (email and
// social providers) issues it with the same flags. sameSite/domain are
// configurable so web+admin can sit on sibling origins; 'strict' breaks
// cross-origin refresh, the default is 'lax', and 'none' forces secure.
function refreshCookieOptions(
  configService: ConfigService<AllConfigType>,
): CookieOptions {
  const sameSite = configService.getOrThrow('app.cookieSameSite', {
    infer: true,
  });
  const secure =
    sameSite === 'none' ||
    configService.getOrThrow('app.cookieSecure', { infer: true });
  const domain = configService.get('app.cookieDomain', { infer: true });
  return { httpOnly: true, secure, sameSite, domain, path: '/' };
}

export function setRefreshCookie(
  response: Response,
  configService: ConfigService<AllConfigType>,
  token: string,
): void {
  const maxAge = Number(
    ms(configService.getOrThrow('auth.refreshExpires', { infer: true })),
  );
  response.cookie(REFRESH_COOKIE_NAME, token, {
    ...refreshCookieOptions(configService),
    maxAge,
  });
}

export function clearRefreshCookie(
  response: Response,
  configService: ConfigService<AllConfigType>,
): void {
  response.clearCookie(
    REFRESH_COOKIE_NAME,
    refreshCookieOptions(configService),
  );
}
