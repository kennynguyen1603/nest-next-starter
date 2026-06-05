import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';

import { getConfig } from '@/config/auth/auth.config';

// Constant-time string compare to avoid leaking credentials via timing.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function basicAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Queues Access"');
    res.status(401).send('Authentication required');
    return;
  }

  const base64Credentials = auth.split(' ')[1] ?? '';
  const credentials = Buffer.from(base64Credentials, 'base64').toString(
    'ascii',
  );
  const [username, password] = credentials.split(':');

  const config = getConfig();

  if (
    safeEqual(username ?? '', config.basicAuth.username ?? '') &&
    safeEqual(password ?? '', config.basicAuth.password ?? '')
  ) {
    next();
    return;
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Queues Access"');
  res.status(401).send('Invalid credentials');
}
