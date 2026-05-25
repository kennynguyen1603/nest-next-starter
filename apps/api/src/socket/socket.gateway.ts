import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { Server } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AllConfigType } from '@/config/config.type';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { CacheService } from '@/shared/cache/cache.service';
import { AuthenticatedSocket } from './types/authenticated-socket.type';
import { SocketEvent } from './types/socket-event.enum';

const USER_SOCKET_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_DOMAIN ?? '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class SocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  public server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
    private readonly cacheService: CacheService,
    @InjectPinoLogger(SocketGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.query?.token as string | undefined);

    if (!token) {
      socket.emit(SocketEvent.Error, { message: 'Unauthorized' });
      socket.disconnect(true);
      return;
    }

    try {
      const secret = this.configService.getOrThrow('auth.secret', {
        infer: true,
      });
      const payload = await this.jwtService.verifyAsync<JwtPayloadType>(token, {
        secret,
      });

      socket.data.user = payload;
      const userId = payload.id;

      await socket.join(`user:${userId}`);

      const existing =
        (await this.cacheService.get<string[]>({
          key: 'UserSocketClients',
          args: [userId],
        })) ?? [];
      await this.cacheService.set(
        { key: 'UserSocketClients', args: [userId] },
        [...existing, socket.id],
        { ttl: USER_SOCKET_CACHE_TTL_MS },
      );

      this.logger.info({ userId, socketId: socket.id }, 'Socket connected');
    } catch {
      socket.emit(SocketEvent.Error, { message: 'Unauthorized' });
      socket.disconnect(true);
    }
  }

  onModuleDestroy(): void {
    this.server?.disconnectSockets(true);
  }

  async handleDisconnect(socket: AuthenticatedSocket): Promise<void> {
    const userId = socket.data.user?.id;
    if (!userId) return;

    const existing =
      (await this.cacheService.get<string[]>({
        key: 'UserSocketClients',
        args: [userId],
      })) ?? [];
    const remaining = existing.filter((id) => id !== socket.id);

    if (remaining.length > 0) {
      await this.cacheService.set(
        { key: 'UserSocketClients', args: [userId] },
        remaining,
        { ttl: USER_SOCKET_CACHE_TTL_MS },
      );
    } else {
      await this.cacheService.delete({
        key: 'UserSocketClients',
        args: [userId],
      });
    }

    this.logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
  }
}
