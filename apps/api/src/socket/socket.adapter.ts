import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { RedisConfig } from '@/config/redis/redis-config.type';

const logger = new Logger('SocketRedisAdapter');

export async function createSocketRedisAdapter(config: RedisConfig) {
  const pubClient = new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    tls: config.tls,
    lazyConnect: true,
  });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err: Error) => logger.error(err.message, 'pub'));
  subClient.on('error', (err: Error) => logger.error(err.message, 'sub'));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  return {
    adapter: createAdapter(pubClient, subClient),
    cleanup: async () => {
      await Promise.all([pubClient.quit(), subClient.quit()]);
    },
  };
}
