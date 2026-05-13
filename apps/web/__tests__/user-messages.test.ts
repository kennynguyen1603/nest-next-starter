import { describe, it, expect } from 'vitest';
import en from '../messages/en.json';
import vi from '../messages/vi.json';

const REQUIRED_USER_KEYS = [
  'editProfile',
  'uploadPhoto',
  'deleteAccount',
  'deleteConfirm',
  'saveChanges',
  'saving',
  'deleting',
  'firstName',
  'lastName',
  'email',
  'oldPassword',
  'newPassword',
  'updateSuccess',
  'deleteSuccess',
  'errorDefault',
] as const;

const REQUIRED_LOCALE_KEYS = ['switchLanguage', 'en', 'vi'] as const;

describe('user messages', () => {
  it.each(REQUIRED_USER_KEYS)('en.json has user.%s', (key) => {
    expect(en.user).toHaveProperty(key);
    expect(typeof (en.user as Record<string, string>)[key]).toBe('string');
  });

  it.each(REQUIRED_USER_KEYS)('vi.json has user.%s', (key) => {
    expect(vi.user).toHaveProperty(key);
    expect(typeof (vi.user as Record<string, string>)[key]).toBe('string');
  });
});

describe('locale messages', () => {
  it.each(REQUIRED_LOCALE_KEYS)('en.json has locale.%s', (key) => {
    expect(en.locale).toHaveProperty(key);
  });

  it.each(REQUIRED_LOCALE_KEYS)('vi.json has locale.%s', (key) => {
    expect(vi.locale).toHaveProperty(key);
  });
});

describe('auth.forgotPassword messages', () => {
  it('en.json has all forgotPassword keys', () => {
    expect(en.auth.forgotPassword).toBeDefined();
    expect(en.auth.forgotPassword).toHaveProperty('title');
    expect(en.auth.forgotPassword).toHaveProperty('successTitle');
    expect(en.auth.forgotPassword).toHaveProperty('submit');
  });

  it('vi.json has all forgotPassword keys', () => {
    expect(vi.auth.forgotPassword).toBeDefined();
    expect(vi.auth.forgotPassword).toHaveProperty('title');
    expect(vi.auth.forgotPassword).toHaveProperty('successTitle');
    expect(vi.auth.forgotPassword).toHaveProperty('submit');
  });
});

describe('auth.resetPassword messages', () => {
  it('en.json has all resetPassword keys', () => {
    expect(en.auth.resetPassword).toBeDefined();
    expect(en.auth.resetPassword).toHaveProperty('title');
    expect(en.auth.resetPassword).toHaveProperty('successTitle');
    expect(en.auth.resetPassword).toHaveProperty('submit');
  });

  it('vi.json has all resetPassword keys', () => {
    expect(vi.auth.resetPassword).toBeDefined();
    expect(vi.auth.resetPassword).toHaveProperty('title');
    expect(vi.auth.resetPassword).toHaveProperty('successTitle');
    expect(vi.auth.resetPassword).toHaveProperty('submit');
  });
});
