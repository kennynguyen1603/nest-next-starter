import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { AuthTwitterService } from './auth-twitter.service';

const loginDto = {
  code: 'auth-code',
  codeVerifier: 'verifier',
  redirectUri: 'http://localhost:3000/auth/twitter/callback',
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

function makeService() {
  const values: Record<string, string> = {
    'twitter.clientId': 'client-id',
    'twitter.clientSecret': 'client-secret',
  };
  const configService = {
    getOrThrow: jest.fn((key: string) => values[key]),
  } as unknown as ConfigService;
  const logger = {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;
  return new AuthTwitterService(logger, configService as never);
}

describe('AuthTwitterService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('redeems the code with app credentials and returns the profile', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'user-token' }))
      .mockResolvedValueOnce(
        jsonResponse({
          data: {
            id: 'tw-1',
            name: 'Ada Lovelace',
            profile_image_url: 'https://pbs/a_normal.png',
          },
        }),
      );

    await expect(makeService().getProfileByToken(loginDto)).resolves.toEqual({
      id: 'tw-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      provider: 'twitter',
      photoUrl: 'https://pbs/a_400x400.png',
    });

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(tokenUrl).toBe('https://api.twitter.com/2/oauth2/token');
    expect((tokenInit.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
    );
    expect(Object.fromEntries(tokenInit.body as URLSearchParams)).toEqual({
      grant_type: 'authorization_code',
      code: 'auth-code',
      code_verifier: 'verifier',
      redirect_uri: loginDto.redirectUri,
    });

    const [, profileInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((profileInit.headers as Record<string, string>).Authorization).toBe(
      'Bearer user-token',
    );
  });

  it('rejects a code that X refuses to redeem', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: 'invalid_request' }, 400),
    );

    const promise = makeService().getProfileByToken(loginDto);
    await expect(promise).rejects.toBeInstanceOf(HttpException);
    await expect(promise).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a profile response without an id', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ access_token: 'user-token' }))
      .mockResolvedValueOnce(jsonResponse({ data: {} }));

    await expect(
      makeService().getProfileByToken(loginDto),
    ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
  });
});
