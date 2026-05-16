import { seconds } from '@nestjs/throttler';
import { getConfig } from './throttler.config';

describe('getConfig', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
    delete process.env.THROTTLER_ENABLED;
    delete process.env.THROTTLER_LIMIT;
    delete process.env.THROTTLER_TTL;
  });

  afterEach(() => {
    process.env = original;
  });

  describe('enabled', () => {
    it('is true when THROTTLER_ENABLED is not set', () => {
      expect(getConfig().enabled).toBe(true);
    });

    it('is false when THROTTLER_ENABLED=false', () => {
      process.env.THROTTLER_ENABLED = 'false';
      expect(getConfig().enabled).toBe(false);
    });

    it('is true when THROTTLER_ENABLED=true', () => {
      process.env.THROTTLER_ENABLED = 'true';
      expect(getConfig().enabled).toBe(true);
    });
  });

  describe('limit', () => {
    it('defaults to 3', () => {
      expect(getConfig().limit).toBe(3);
    });

    it('reads from THROTTLER_LIMIT', () => {
      process.env.THROTTLER_LIMIT = '10';
      expect(getConfig().limit).toBe(10);
    });
  });

  describe('ttl', () => {
    it('is 0 when disabled', () => {
      process.env.THROTTLER_ENABLED = 'false';
      expect(getConfig().ttl).toBe(0);
    });

    it('defaults to seconds(1) when enabled and THROTTLER_TTL not set', () => {
      expect(getConfig().ttl).toBe(seconds(1));
    });

    it('reads from THROTTLER_TTL in seconds when enabled', () => {
      process.env.THROTTLER_TTL = '30';
      expect(getConfig().ttl).toBe(seconds(30));
    });
  });
});
