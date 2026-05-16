import { ConfigService } from '@nestjs/config';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import useThrottlerFactory from './throttler.factory';

jest.mock('@nest-lab/throttler-storage-redis', () => ({
  ThrottlerStorageRedisService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('ioredis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

describe('useThrottlerFactory', () => {
  let config: { getOrThrow: jest.Mock };

  beforeEach(() => {
    config = { getOrThrow: jest.fn() };
    jest.clearAllMocks();
  });

  function mockConfig(enabled: boolean, ttl = 1000, limit = 3) {
    config.getOrThrow.mockImplementation((key: string) => {
      switch (key) {
        case 'throttler.enabled':
          return enabled;
        case 'throttler.ttl':
          return ttl;
        case 'throttler.limit':
          return limit;
        case 'redis':
          return { host: 'localhost', port: 6379 };
        default:
          throw new Error(`Unexpected config key: ${String(key)}`);
      }
    });
  }

  describe('skipIf', () => {
    it('returns true when throttler is disabled', () => {
      mockConfig(false);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.skipIf!({} as any)).toBe(true);
    });

    it('returns false when throttler is enabled', () => {
      mockConfig(true);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.skipIf!({} as any)).toBe(false);
    });
  });

  describe('throttlers', () => {
    it('passes ttl and limit from config', () => {
      mockConfig(true, 60000, 5);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.throttlers).toEqual([{ ttl: 60000, limit: 5 }]);
    });
  });

  describe('storage', () => {
    it('creates ThrottlerStorageRedisService', () => {
      mockConfig(true);
      const result = useThrottlerFactory(config as unknown as ConfigService);
      expect(result.storage).toBeDefined();
      expect(ThrottlerStorageRedisService).toHaveBeenCalledTimes(1);
    });
  });
});
