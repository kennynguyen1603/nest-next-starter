import Redis from 'ioredis';
import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Server, ServerOptions } from 'socket.io';
import { RedisConfig } from '@/config/redis/redis-config.type';

const logger = new Logger('RedisIoAdapter');

// Broadcasts (rooms, emitToUser) fan out to every instance through Redis
// pub/sub, so the gateway can scale horizontally. Installed via
// app.useWebSocketAdapter() before app.init(), so the server is created with
// the adapter already attached and Nest disposes the clients on shutdown.
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private clients: Redis[] = [];

  async connectToRedis(config: RedisConfig): Promise<void> {
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

    this.clients = [pubClient, subClient];
    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }

  async dispose(): Promise<void> {
    await super.dispose();
    await Promise.all(this.clients.map((client) => client.quit()));
    this.clients = [];
  }
}
