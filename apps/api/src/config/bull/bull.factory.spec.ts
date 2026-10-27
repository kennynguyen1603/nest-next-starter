import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import useBullFactory from './bull.factory';

describe('useBullFactory', () => {
  const defaultJobOptions = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  };

  function createConfig(values: Record<string, unknown>) {
    const read = (key: string) => values[key];
    return {
      get: jest.fn(read),
      getOrThrow: jest.fn((key: string) => {
        if (!(key in values)) throw new Error(`Missing config: ${key}`);
        return values[key];
      }),
    } as unknown as ConfigService<AllConfigType>;
  }

  it('passes the shared job defaults and redis connection to BullMQ', () => {
    const tls = { rejectUnauthorized: true };
    const options = useBullFactory(
      createConfig({
        'queue.defaultJobOptions': defaultJobOptions,
        'app.apiPrefix': 'v1',
        'redis.host': 'redis',
        'redis.port': 6380,
        'redis.password': 'secret',
        'redis.tls': tls,
      }),
    );

    expect(options).toEqual({
      defaultJobOptions,
      prefix: 'v1:bull',
      connection: { host: 'redis', port: 6380, password: 'secret', tls },
    });
  });

  it('defaults the key prefix to "api"', () => {
    const options = useBullFactory(
      createConfig({ 'redis.host': 'redis', 'redis.port': 6379 }),
    );

    expect(options.prefix).toBe('api:bull');
  });

  it('throws when the redis host is missing', () => {
    expect(() => useBullFactory(createConfig({ 'redis.port': 6379 }))).toThrow(
      'Missing config: redis.host',
    );
  });
});
