import { createHmac } from 'crypto';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { AuthFacebookService } from './auth-facebook.service';

const APP_ID = 'app-id';
const APP_SECRET = 'app-secret';
const USER_TOKEN = 'user-token';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const validDebug = jsonResponse({ data: { is_valid: true, app_id: APP_ID } });
const profile = jsonResponse({
  id: 'fb-1',
  email: 'user@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  picture: { data: { url: 'https://example.com/a.png' } },
});

function makeService(config: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    'facebook.appId': APP_ID,
    'facebook.appSecret': APP_SECRET,
    ...config,
  };
  const configService = {
    get: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const logger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;
  return new AuthFacebookService(configService as never, logger);
}

async function expectStatus(promise: Promise<unknown>, status: HttpStatus) {
  await expect(promise).rejects.toBeInstanceOf(HttpException);
  await expect(promise).rejects.toMatchObject({ status });
}

describe('AuthFacebookService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  function call(index: number): { url: URL; init: RequestInit } {
    const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
    return { url: new URL(url), init };
  }

  describe('getProfileByToken', () => {
    it('returns the normalized profile for a valid token', async () => {
      fetchMock
        .mockResolvedValueOnce(validDebug)
        .mockResolvedValueOnce(profile);

      await expect(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
      ).resolves.toEqual({
        id: 'fb-1',
        email: 'user@example.com',
        emailVerified: false,
        firstName: 'Ada',
        lastName: 'Lovelace',
        provider: 'facebook',
        photoUrl: 'https://example.com/a.png',
      });
    });

    it('keeps the app access token out of the debug_token URL', async () => {
      fetchMock
        .mockResolvedValueOnce(validDebug)
        .mockResolvedValueOnce(profile);

      await makeService().getProfileByToken({ accessToken: USER_TOKEN });

      const { url, init } = call(0);
      expect(url.pathname).toBe('/debug_token');
      expect(url.searchParams.get('input_token')).toBe(USER_TOKEN);
      expect(url.searchParams.has('access_token')).toBe(false);
      expect(url.toString()).not.toContain(APP_SECRET);
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${APP_ID}|${APP_SECRET}`,
      });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('sends the user token as a header with appsecret_proof', async () => {
      fetchMock
        .mockResolvedValueOnce(validDebug)
        .mockResolvedValueOnce(profile);

      await makeService().getProfileByToken({ accessToken: USER_TOKEN });

      const { url, init } = call(1);
      const expectedProof = createHmac('sha256', APP_SECRET)
        .update(USER_TOKEN)
        .digest('hex');
      expect(url.searchParams.get('appsecret_proof')).toBe(expectedProof);
      expect(url.searchParams.has('access_token')).toBe(false);
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${USER_TOKEN}`,
      });
      expect(init.signal).toBeInstanceOf(AbortSignal);
    });

    it('rejects a token issued for another app', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ data: { is_valid: true, app_id: 'other-app' } }),
      );

      await expectStatus(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
        HttpStatus.UNAUTHORIZED,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects an invalid token', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ data: { is_valid: false, app_id: APP_ID } }),
      );

      await expectStatus(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('rejects a debug_token response without data', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      await expectStatus(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('rejects when debug_token returns a non-OK status', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 400));

      await expectStatus(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('fails closed when app credentials are missing', async () => {
      await expectStatus(
        makeService({ 'facebook.appSecret': undefined }).getProfileByToken({
          accessToken: USER_TOKEN,
        }),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a profile without an id', async () => {
      fetchMock
        .mockResolvedValueOnce(validDebug)
        .mockResolvedValueOnce(jsonResponse({ email: 'user@example.com' }));

      await expectStatus(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
        HttpStatus.BAD_REQUEST,
      );
    });

    it('forwards the Graph error status for the profile call', async () => {
      fetchMock
        .mockResolvedValueOnce(validDebug)
        .mockResolvedValueOnce(
          jsonResponse({ error: { message: 'Invalid appsecret_proof' } }, 403),
        );

      await expectStatus(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
        HttpStatus.FORBIDDEN,
      );
    });

    it('maps a profile timeout to 408', async () => {
      const timeout = new Error('timed out');
      timeout.name = 'TimeoutError';
      fetchMock
        .mockResolvedValueOnce(validDebug)
        .mockRejectedValueOnce(timeout);

      await expectStatus(
        makeService().getProfileByToken({ accessToken: USER_TOKEN }),
        HttpStatus.REQUEST_TIMEOUT,
      );
    });
  });
});
