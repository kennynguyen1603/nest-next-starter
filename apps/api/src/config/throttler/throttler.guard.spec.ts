import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './throttler.guard';

function makeRequest(overrides: Record<string, unknown> = {}) {
  return { headers: {}, ip: '127.0.0.1', ips: undefined, ...overrides };
}

describe('AppThrottlerGuard', () => {
  let guard: AppThrottlerGuard;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ limit: 3, ttl: 60000 }] }),
      ],
      providers: [AppThrottlerGuard],
    }).compile();
    guard = module.get(AppThrottlerGuard);
  });

  describe('getTracker', () => {
    async function track(overrides: Record<string, unknown>) {
      return (guard as any).getTracker(makeRequest(overrides));
    }

    it('ignores client-supplied x-forwarded-for and uses the framework IP', async () => {
      // Spoofable headers must NOT control the rate-limit key.
      expect(
        await track({
          headers: { 'x-forwarded-for': '1.2.3.4' },
          ips: undefined,
          ip: '127.0.0.1',
        }),
      ).toBe('127.0.0.1');
    });

    it('ignores client-supplied x-real-ip and uses the framework IP', async () => {
      expect(
        await track({
          headers: { 'x-real-ip': '10.0.0.1' },
          ips: undefined,
          ip: '127.0.0.1',
        }),
      ).toBe('127.0.0.1');
    });

    it('prefers trust-proxy-derived req.ips[0] over a raw x-forwarded-for header', async () => {
      expect(
        await track({
          headers: { 'x-forwarded-for': '1.2.3.4' },
          ips: ['192.168.1.1'],
          ip: '10.0.0.1',
        }),
      ).toBe('192.168.1.1');
    });

    it('returns "unknown" when no IP can be derived', async () => {
      expect(await track({ headers: {}, ips: undefined, ip: undefined })).toBe(
        'unknown',
      );
    });

    it('uses req.ips[0] when no proxy headers and ips is populated', async () => {
      expect(
        await track({ headers: {}, ips: ['192.168.1.1', '10.0.0.1'] }),
      ).toBe('192.168.1.1');
    });

    it('falls back to req.ip when no proxy headers and ips is empty array', async () => {
      expect(await track({ headers: {}, ips: [], ip: '127.0.0.1' })).toBe(
        '127.0.0.1',
      );
    });

    it('falls back to req.ip when no proxy headers and ips is undefined', async () => {
      expect(
        await track({ headers: {}, ips: undefined, ip: '172.16.0.1' }),
      ).toBe('172.16.0.1');
    });
  });
});
