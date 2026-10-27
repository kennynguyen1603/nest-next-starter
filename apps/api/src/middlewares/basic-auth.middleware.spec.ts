import { Request, Response } from 'express';

import { basicAuthMiddleware } from './basic-auth.middleware';

const USERNAME = 'admin';
const PASSWORD = 'p@ss:word:with:colons';

function encode(credentials: string): string {
  return `Basic ${Buffer.from(credentials, 'utf8').toString('base64')}`;
}

function run(authorization?: string) {
  const req = { headers: { authorization } } as unknown as Request;
  const res = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  };
  const next = jest.fn();
  basicAuthMiddleware(req, res as unknown as Response, next);
  return { res, next };
}

function expectChallenge(
  { res, next }: ReturnType<typeof run>,
  message: string,
) {
  expect(next).not.toHaveBeenCalled();
  expect(res.setHeader).toHaveBeenCalledWith(
    'WWW-Authenticate',
    'Basic realm="Queues Access"',
  );
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.send).toHaveBeenCalledWith(message);
}

describe('basicAuthMiddleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      BASIC_AUTH_USERNAME: USERNAME,
      BASIC_AUTH_PASSWORD: PASSWORD,
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('calls next for valid credentials, keeping colons in the password', () => {
    const { res, next } = run(encode(`${USERNAME}:${PASSWORD}`));

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('accepts a case-insensitive scheme', () => {
    const { next } = run(
      encode(`${USERNAME}:${PASSWORD}`).replace('Basic', 'basic'),
    );

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('decodes credentials as UTF-8', () => {
    process.env.BASIC_AUTH_USERNAME = 'quản-trị';
    process.env.BASIC_AUTH_PASSWORD = 'mật-khẩu-✓';

    const { next } = run(encode('quản-trị:mật-khẩu-✓'));

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing header', undefined],
    ['non-Basic scheme', 'Bearer some-token'],
    ['empty Basic payload', 'Basic '],
    ['non-base64 payload', 'Basic not base64!'],
    ['payload without a colon', encode('adminpassword')],
  ])('challenges a %s', (_, header) => {
    expectChallenge(run(header), 'Authentication required');
  });

  it.each([
    ['wrong username', encode(`root:${PASSWORD}`)],
    ['wrong password', encode(`${USERNAME}:wrong`)],
    ['truncated password', encode(`${USERNAME}:p@ss`)],
    ['password with a longer suffix', encode(`${USERNAME}:${PASSWORD}x`)],
    ['empty credentials', encode(':')],
  ])('rejects a %s', (_, header) => {
    expectChallenge(run(header), 'Invalid credentials');
  });

  it.each([
    ['username', 'BASIC_AUTH_USERNAME'],
    ['password', 'BASIC_AUTH_PASSWORD'],
  ])('fails closed when the configured %s is empty', (_, key) => {
    process.env[key] = '';
    const username = key === 'BASIC_AUTH_USERNAME' ? '' : USERNAME;
    const password = key === 'BASIC_AUTH_PASSWORD' ? '' : PASSWORD;

    expectChallenge(
      run(encode(`${username}:${password}`)),
      'Invalid credentials',
    );
  });

  it('fails closed when credentials are not configured at all', () => {
    delete process.env.BASIC_AUTH_USERNAME;
    delete process.env.BASIC_AUTH_PASSWORD;

    expectChallenge(run(encode(':')), 'Invalid credentials');
  });
});
