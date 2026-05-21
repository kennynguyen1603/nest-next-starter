import { GlobalConfig } from '@/config/config.type';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// @nestjs/cache-manager@3 uses keyv@5 which expects a store with get/set/delete/clear.
// cache-manager-ioredis-yet@2 implements the old cache-manager@5 Store interface (del/reset)
// and fails keyv@5's adapter validation. Use ioredis directly instead.
function useCacheFactory(config: ConfigService<GlobalConfig>) {
  const redis = new Redis({
    host: config.getOrThrow('redis.host', { infer: true }),
    port: config.getOrThrow('redis.port', { infer: true }),
    password: config.getOrThrow('redis.password', { infer: true }),
    tls: config.get('redis.tls', { infer: true }),
  });

  return {
    stores: [
      {
        get: (key: string) => redis.get(key).then((v) => v ?? undefined),
        set: (key: string, value: string, ttl?: number) =>
          ttl ? redis.set(key, value, 'PX', ttl) : redis.set(key, value),
        delete: (key: string) => redis.del(key).then((n) => n > 0),
        clear: async () => {
          /* intentional no-op: avoid flushing shared Redis db */
        },
      },
    ],
  };
}

export default useCacheFactory;
