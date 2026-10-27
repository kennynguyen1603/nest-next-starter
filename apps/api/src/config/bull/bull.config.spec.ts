import { getConfig, getQueueConcurrency } from './bull.config';

describe('bull config', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original, REDIS_HOST: 'localhost' };
    delete process.env.API_PREFIX;
    delete process.env.QUEUE_REMOVE_ON_COMPLETE;
    delete process.env.QUEUE_REMOVE_ON_FAIL;
    delete process.env.QUEUE_FAILED_RETRY_ATTEMPTS;
  });

  afterEach(() => {
    process.env = original;
  });

  describe('getQueueConcurrency', () => {
    it('returns the parsed value when it is a positive integer', () => {
      expect(getQueueConcurrency('8', 5)).toBe(8);
    });

    it.each([undefined, '', '0', '-2', 'abc'])('falls back for %p', (value) => {
      expect(getQueueConcurrency(value, 5)).toBe(5);
    });
  });

  describe('getConfig', () => {
    it('keeps a bounded job history and retries with exponential backoff', () => {
      expect(getConfig().defaultJobOptions).toEqual({
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    });

    it('removes jobs immediately when the env flags are true', () => {
      process.env.QUEUE_REMOVE_ON_COMPLETE = 'true';
      process.env.QUEUE_REMOVE_ON_FAIL = 'true';

      const { defaultJobOptions } = getConfig();

      expect(defaultJobOptions?.removeOnComplete).toBe(true);
      expect(defaultJobOptions?.removeOnFail).toBe(true);
    });

    it('reads retry attempts from env', () => {
      process.env.QUEUE_FAILED_RETRY_ATTEMPTS = '7';

      expect(getConfig().defaultJobOptions?.attempts).toBe(7);
    });

    it('prefixes queue keys with the API prefix', () => {
      expect(getConfig().prefix).toBe('api:bull');

      process.env.API_PREFIX = 'v2';
      expect(getConfig().prefix).toBe('v2:bull');
    });
  });
});
