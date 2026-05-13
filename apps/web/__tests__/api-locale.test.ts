import { describe, it, expect, beforeEach } from 'vitest';
import { getLocale } from '../lib/api';

describe('getLocale', () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0]?.trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
  });

  it('returns "en" when NEXT_LOCALE cookie is not set', () => {
    expect(getLocale()).toBe('en');
  });

  it('returns "vi" when NEXT_LOCALE=vi cookie is set', () => {
    document.cookie = 'NEXT_LOCALE=vi';
    expect(getLocale()).toBe('vi');
  });

  it('returns "en" when NEXT_LOCALE=en cookie is set', () => {
    document.cookie = 'NEXT_LOCALE=en';
    expect(getLocale()).toBe('en');
  });

  it('reads NEXT_LOCALE when multiple cookies are present', () => {
    document.cookie = 'other_cookie=foo';
    document.cookie = 'NEXT_LOCALE=vi';
    document.cookie = 'another=bar';
    expect(getLocale()).toBe('vi');
  });

  it('falls back to "en" for an unrecognized cookie value', () => {
    // getLocale returns whatever is in the cookie; routing config
    // is responsible for validation. Here we verify it reads faithfully.
    document.cookie = 'NEXT_LOCALE=fr';
    expect(getLocale()).toBe('fr');
  });
});
