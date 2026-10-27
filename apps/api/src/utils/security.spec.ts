import { Request } from 'express';
import {
  formatDeviceName,
  generateDeviceId,
  getClientIp,
  getSecurityContext,
} from './security';

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function makeRequest(overrides: Record<string, unknown> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '10.0.0.9' },
    ...overrides,
  } as unknown as Request;
}

describe('getClientIp', () => {
  it.each([
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip',
    'x-cluster-client-ip',
  ])('ignores the client-supplied %s header', (header) => {
    expect(getClientIp(makeRequest({ headers: { [header]: '6.6.6.6' } }))).toBe(
      '127.0.0.1',
    );
  });

  it('returns the trust-proxy-derived req.ip', () => {
    expect(getClientIp(makeRequest({ ip: '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('falls back to the socket address when req.ip is missing', () => {
    expect(getClientIp(makeRequest({ ip: undefined }))).toBe('10.0.0.9');
  });

  it('returns 0.0.0.0 when no address is known', () => {
    expect(getClientIp(makeRequest({ ip: undefined, socket: undefined }))).toBe(
      '0.0.0.0',
    );
  });
});

describe('getSecurityContext', () => {
  it('builds the context from user-agent and req.ip', () => {
    const ctx = getSecurityContext(
      makeRequest({
        headers: { 'user-agent': CHROME_UA, 'x-forwarded-for': '6.6.6.6' },
      }),
    );

    expect(ctx.ip).toBe('127.0.0.1');
    expect(ctx.userAgent).toBe(CHROME_UA);
    expect(ctx.deviceInfo).toMatchObject({ browser: 'Chrome', os: 'macOS' });
  });

  it('prefers x-forwarded-user-agent from server-side frontends', () => {
    const ctx = getSecurityContext(
      makeRequest({
        headers: { 'user-agent': 'node', 'x-forwarded-user-agent': CHROME_UA },
      }),
    );
    expect(ctx.userAgent).toBe(CHROME_UA);
  });

  it('uses "unknown" when no user-agent is sent', () => {
    expect(getSecurityContext(makeRequest()).userAgent).toBe('unknown');
  });
});

describe('formatDeviceName', () => {
  it('combines browser major version and OS', () => {
    expect(
      formatDeviceName({
        browser: 'Chrome',
        browserVersion: '120.0.1',
        os: 'macOS',
      }),
    ).toBe('Chrome 120 on macOS');
  });

  it('returns "Unknown Device" when nothing is known', () => {
    expect(formatDeviceName({})).toBe('Unknown Device');
  });
});

describe('generateDeviceId', () => {
  it('is a stable 32-char hex digest of the user agent', () => {
    const id = generateDeviceId(CHROME_UA);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(generateDeviceId(CHROME_UA)).toBe(id);
    expect(generateDeviceId('other')).not.toBe(id);
  });
});
