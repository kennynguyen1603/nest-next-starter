import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  setRefreshCookie,
} from './refresh-cookie.util';

function makeConfig(values: Record<string, unknown>) {
  const defaults = {
    'app.cookieSameSite': 'lax',
    'app.cookieSecure': false,
    'auth.refreshExpires': '7d',
    ...values,
  };
  return {
    get: jest.fn((key: string) => defaults[key]),
    getOrThrow: jest.fn((key: string) => {
      if (defaults[key] === undefined) throw new Error(`missing ${key}`);
      return defaults[key];
    }),
  } as unknown as ConfigService;
}

function makeResponse() {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response & { cookie: jest.Mock; clearCookie: jest.Mock };
}

describe('refresh cookie util', () => {
  it('sets an httpOnly, root-path cookie with maxAge from auth.refreshExpires', () => {
    const response = makeResponse();
    setRefreshCookie(response, makeConfig({}), 'tok');

    expect(response.cookie).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, 'tok', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      domain: undefined,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('honours app.cookieSecure and app.cookieDomain', () => {
    const response = makeResponse();
    setRefreshCookie(
      response,
      makeConfig({
        'app.cookieSecure': true,
        'app.cookieSameSite': 'strict',
        'app.cookieDomain': '.example.com',
      }),
      'tok',
    );

    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'tok',
      expect.objectContaining({
        secure: true,
        sameSite: 'strict',
        domain: '.example.com',
      }),
    );
  });

  it('forces secure when sameSite is none (browsers reject it otherwise)', () => {
    const response = makeResponse();
    setRefreshCookie(
      response,
      makeConfig({ 'app.cookieSameSite': 'none', 'app.cookieSecure': false }),
      'tok',
    );

    expect(response.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'tok',
      expect.objectContaining({ sameSite: 'none', secure: true }),
    );
  });

  it('clears the cookie with the same scope it was set with, minus maxAge', () => {
    const response = makeResponse();
    const config = makeConfig({ 'app.cookieDomain': '.example.com' });
    setRefreshCookie(response, config, 'tok');
    clearRefreshCookie(response, config);

    const { maxAge, ...setScope } = response.cookie.mock.calls[0][2];
    expect(maxAge).toEqual(expect.any(Number));
    expect(response.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      setScope,
    );
  });

  it('fails loudly when the refresh lifetime is not configured', () => {
    expect(() =>
      setRefreshCookie(
        makeResponse(),
        makeConfig({ 'auth.refreshExpires': undefined }),
        'tok',
      ),
    ).toThrow('missing auth.refreshExpires');
  });
});
