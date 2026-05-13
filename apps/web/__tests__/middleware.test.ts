import { describe, it, expect, vi } from 'vitest';

// next-intl/middleware and next-intl/routing depend on next/server which is
// not available in the Vitest jsdom environment. Mock them so we can test
// the middleware config (matcher pattern) in isolation.
vi.mock('next-intl/middleware', () => ({ default: () => () => {} }));
vi.mock('next-intl/routing', () => ({
  defineRouting: (config: unknown) => config,
}));

import { config } from '../middleware';

// Next.js anchors matcher patterns from the start of the path.
// We simulate that by wrapping the inner pattern with anchors.
// The raw pattern is: /((?!api|auth|_next|_vercel|.*\..*).*)/
// We test the inner group anchored to the start of the path segment.
const PRIMARY = config.matcher[0] ?? '';
const INNER = PRIMARY
  .replace(/^\/\(/, '')  // strip leading /(
  .replace(/\)$/, '');   // strip trailing )

const ANCHORED = new RegExp(`^/${INNER}$`);

function matches(pathname: string): boolean {
  return ANCHORED.test(pathname);
}

describe('middleware matcher', () => {
  it('has a primary pattern and a root fallback', () => {
    expect(config.matcher).toHaveLength(2);
    expect(config.matcher[1]).toBe('/');
  });

  describe('pattern excludes the right segments', () => {
    it('excludes "api" segment', () => {
      expect(PRIMARY).toContain('api');
    });

    it('excludes "auth" segment', () => {
      expect(PRIMARY).toContain('auth');
    });

    it('excludes "_next" segment', () => {
      expect(PRIMARY).toContain('_next');
    });

    it('excludes files with extensions via ".*\\\\..* pattern"', () => {
      expect(PRIMARY).toContain('.*\\.');
    });
  });

  describe('routes that should be intercepted (localized)', () => {
    it('matches root /', () => {
      expect(matches('/')).toBe(true);
    });

    it('matches /login', () => {
      expect(matches('/login')).toBe(true);
    });

    it('matches /register', () => {
      expect(matches('/register')).toBe(true);
    });

    it('matches /en/login', () => {
      expect(matches('/en/login')).toBe(true);
    });

    it('matches /vi', () => {
      expect(matches('/vi')).toBe(true);
    });
  });

  describe('routes that must be excluded', () => {
    it('excludes /api routes (Next.js API routes)', () => {
      expect(matches('/api/auth/google/exchange')).toBe(false);
    });

    it('excludes /auth routes (OAuth callback)', () => {
      expect(matches('/auth/google/callback')).toBe(false);
    });

    it('excludes /_next static files', () => {
      expect(matches('/_next/static/chunks/main.js')).toBe(false);
    });

    it('excludes files with extensions (images, fonts)', () => {
      expect(matches('/favicon.ico')).toBe(false);
      expect(matches('/fonts/GeistVF.woff')).toBe(false);
    });
  });
});
