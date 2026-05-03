export enum JwtToken {
  AccessToken = 'access-token',
  RefreshToken = 'refresh-token',
  EmailVerificationToken = 'email-verification-token',
}

export const BEFORE_HOOK_KEY = 'BEFORE_HOOK';
export const AFTER_HOOK_KEY = 'AFTER_HOOK';
export const HOOK_KEY = 'HOOK';
export const AUTH_INSTANCE_KEY = 'AUTH_INSTANCE';

export const IS_PUBLIC_AUTH = 'IS_PUBLIC_AUTH';
export const IS_OPTIONAL_AUTH = 'IS_OPTIONAL_AUTH';
