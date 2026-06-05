import { ContextType, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppThrottlerGuard } from './throttler.guard';

function makeRequest(overrides: Record<string, unknown> = {}) {
  return { headers: {}, ip: '127.0.0.1', ips: undefined, ...overrides };
}

function makeHttpContext(req = makeRequest(), res = {}): ExecutionContext {
  return {
    getType: () => 'http' as ContextType,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ExecutionContext;
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

  describe('getRequestResponse', () => {
    it('returns req and res from HTTP context', () => {
      const req = makeRequest();
      const res = {};
      const result = guard.getRequestResponse(makeHttpContext(req, res));
      expect(result).toEqual({ req, res });
    });

    it('extracts req and res from GraphQL context', () => {
      const req = makeRequest();
      const res = {};

      jest.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: () => ({ req, res }),
      } as unknown as GqlExecutionContext);

      const context = {
        getType: () => 'graphql',
      } as unknown as ExecutionContext;
      const result = guard.getRequestResponse(context);
      expect(result).toEqual({ req, res });
    });
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
