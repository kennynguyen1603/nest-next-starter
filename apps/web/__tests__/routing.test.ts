import { describe, it, expect } from 'vitest';
import { routing } from '../i18n/routing';

describe('i18n routing', () => {
  it('supports en locale', () => {
    expect(routing.locales).toContain('en');
  });

  it('supports vi locale', () => {
    expect(routing.locales).toContain('vi');
  });

  it('has exactly two locales', () => {
    expect(routing.locales).toHaveLength(2);
  });

  it('defaults to en', () => {
    expect(routing.defaultLocale).toBe('en');
  });
});
