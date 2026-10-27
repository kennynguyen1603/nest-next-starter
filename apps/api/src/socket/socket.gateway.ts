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
import { SessionService } from '@/session/session.service';
import { AuthenticatedSocket } from './types/authenticated-socket.type';
import { SocketEvent } from './types/socket-event.enum';

// Same allowlist as HTTP CORS (see main.ts). Fail closed: with no configured
// origin, cross-origin handshakes are rejected instead of reflecting any origin
// with credentials.
export function resolveSocketCorsOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string[] | false {
  const origins = [env.FRONTEND_DOMAIN, env.ADMIN_DOMAIN].filter(
    (origin): origin is string => !!origin,
  );
  return origins.length ? origins : false;
}

@WebSocketGateway({
  cors: {
    origin: resolveSocketCorsOrigin(),
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
    private readonly sessionService: SessionService,
    @InjectPinoLogger(SocketGateway.name)
    private readonly logger: PinoLogger,
  ) {}

  async handleConnection(socket: AuthenticatedSocket): Promise<void> {
    // Only the handshake auth payload is accepted: query-string tokens end up
    // in proxy/access logs and browser history.
    const token = socket.handshake.auth?.token as string | undefined;

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

      // Bind the socket to a live session, like the HTTP JWT strategy does.
      const isActive =
        !!payload.id &&
        !!payload.sessionId &&
        (await this.sessionService.isActiveForUser(
          payload.sessionId,
          payload.id,
        ));
      if (!isActive) {
        throw new Error('Session is not active');
      }

      socket.data.user = payload;
      const userId = payload.id;

      // The room is the source of truth for a user's sockets; the Redis
      // adapter resolves it across instances, so no separate socket registry.
      await socket.join(`user:${userId}`);

      this.logger.info({ userId, socketId: socket.id }, 'Socket connected');
    } catch {
      socket.emit(SocketEvent.Error, { message: 'Unauthorized' });
      socket.disconnect(true);
    }
  }

  // Only this instance's sockets: with the Redis adapter a plain
  // disconnectSockets() would kick clients off every node during a rollout.
  onModuleDestroy(): void {
    this.server?.local.disconnectSockets(true);
  }

  handleDisconnect(socket: AuthenticatedSocket): void {
    const userId = socket.data.user?.id;
    if (!userId) return;

    this.logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
  }
}
