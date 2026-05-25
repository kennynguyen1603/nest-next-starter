import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  constructor(
    private readonly gateway: SocketGateway,
    @InjectPinoLogger(SocketService.name)
    private readonly logger: PinoLogger,
  ) {}

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.gateway.server) {
      this.logger.warn(
        { userId, event },
        'Socket server not ready, skipping emit',
      );
      return;
    }
    this.gateway.server.to(`user:${userId}`).emit(event, payload);
    this.logger.debug({ userId, event }, 'Emitted event to user');
  }

  emitToRoom(room: string, event: string, payload: unknown): void {
    if (!this.gateway.server) {
      this.logger.warn(
        { room, event },
        'Socket server not ready, skipping emit',
      );
      return;
    }
    this.gateway.server.to(room).emit(event, payload);
    this.logger.debug({ room, event }, 'Emitted event to room');
  }
}
