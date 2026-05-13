import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all paths except: Next.js internals, API routes, OAuth callback, static files
  matcher: ['/((?!api|auth|_next|_vercel|.*\\..*).*)', '/'],
};
