import { createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

import { getConfig } from '@/config/auth/auth.config';

// Hash both sides first so the compare is constant-time regardless of input
// length (comparing raw buffers would leak the expected length).
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

// RFC 7617: the user-id cannot contain ':', but the password can, so split on
// the first colon only. Credentials are UTF-8.
function parseBasicCredentials(
  header: string | undefined,
): { username: string; password: string } | null {
  const match = header?.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);
  if (!match?.[1]) return null;

  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator === -1) return null;

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function challenge(res: Response, message: string): void {
  res.setHeader('WWW-Authenticate', 'Basic realm="Queues Access"');
  res.status(401).send(message);
}

export function basicAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const credentials = parseBasicCredentials(req.headers.authorization);
  if (!credentials) {
    challenge(res, 'Authentication required');
    return;
  }

  const { username, password } = getConfig().basicAuth;
  // Fail closed if the credentials are not configured; never accept "":"".
  const usernameOk = safeEqual(credentials.username, username ?? '');
  const passwordOk = safeEqual(credentials.password, password ?? '');
  if (username && password && usernameOk && passwordOk) {
    next();
    return;
  }

  challenge(res, 'Invalid credentials');
}
