import { GlobalConfig } from '@/config/config.type';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

function useThrottlerFactory(config: ConfigService<GlobalConfig>) {
  const enabled = config.getOrThrow('throttler.enabled', { infer: true });
  return {
    skipIf: (_context: ExecutionContext) => !enabled,
    throttlers: [
      {
        ttl: config.getOrThrow('throttler.ttl', { infer: true }),
        limit: config.getOrThrow('throttler.limit', { infer: true }),
      },
    ],
    storage: new ThrottlerStorageRedisService(
      new Redis(config.getOrThrow('redis')),
    ),
  };
}

export default useThrottlerFactory;
