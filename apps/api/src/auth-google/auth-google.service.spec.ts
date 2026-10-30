import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { AuthGoogleService } from './auth-google.service';

const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const basePayload = {
  sub: 'google-sub-1',
  email: 'user@example.com',
  email_verified: true,
  given_name: 'Ada',
  family_name: 'Lovelace',
  picture: 'https://example.com/a.png',
};

function ticketWith(payload: Record<string, unknown> | undefined) {
  return { getPayload: () => payload };
}

async function expectReason(promise: Promise<unknown>, reason: string) {
  await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
  await expect(promise).rejects.toMatchObject({
    response: { errors: { user: reason } },
  });
}

describe('AuthGoogleService', () => {
  let service: AuthGoogleService;

  beforeEach(() => {
    jest.clearAllMocks();
    const configService = {
      get: jest.fn().mockReturnValue('client-id'),
      getOrThrow: jest.fn().mockReturnValue('client-id'),
    } as unknown as ConfigService;
    const logger = {
      debug: jest.fn(),
      warn: jest.fn(),
    } as unknown as PinoLogger;
    service = new AuthGoogleService(configService as never, logger);
  });

  it('returns the social profile for a valid, verified token', async () => {
    mockVerifyIdToken.mockResolvedValue(ticketWith(basePayload));

    await expect(
      service.getProfileByToken({ idToken: 'id-token' }),
    ).resolves.toEqual({
      id: 'google-sub-1',
      email: 'user@example.com',
      emailVerified: true,
      provider: 'google',
      firstName: 'Ada',
      lastName: 'Lovelace',
      photoUrl: 'https://example.com/a.png',
    });
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: ['client-id'],
    });
  });

  it('rejects a token that fails verification', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('bad signature'));

    await expectReason(
      service.getProfileByToken({ idToken: 'forged' }),
      'wrongToken',
    );
  });

  it('rejects a verified token with an empty payload', async () => {
    mockVerifyIdToken.mockResolvedValue(ticketWith(undefined));

    await expectReason(
      service.getProfileByToken({ idToken: 'id-token' }),
      'wrongToken',
    );
  });

  it.each([
    ['unverified', { email_verified: false }],
    ['missing verification claim', { email_verified: undefined }],
    ['missing email', { email: undefined }],
  ])('rejects an account with %s email', async (_label, override) => {
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({ ...basePayload, ...override }),
    );

    await expectReason(
      service.getProfileByToken({ idToken: 'id-token' }),
      'emailNotVerified',
    );
  });

  it('rejects a token whose nonce does not match the client nonce', async () => {
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({ ...basePayload, nonce: 'other' }),
    );

    await expectReason(
      service.getProfileByToken({ idToken: 'id-token', nonce: 'expected' }),
      'wrongToken',
    );
  });

  it('rejects a token without a nonce when the client sent one', async () => {
    mockVerifyIdToken.mockResolvedValue(ticketWith(basePayload));

    await expectReason(
      service.getProfileByToken({ idToken: 'id-token', nonce: 'expected' }),
      'wrongToken',
    );
  });

  it('accepts a token whose nonce matches the client nonce', async () => {
    mockVerifyIdToken.mockResolvedValue(
      ticketWith({ ...basePayload, nonce: 'expected' }),
    );

    await expect(
      service.getProfileByToken({ idToken: 'id-token', nonce: 'expected' }),
    ).resolves.toMatchObject({ id: 'google-sub-1' });
  });
});
