import { Socket } from 'socket.io';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { SocketEvent } from './socket-event.enum';

export interface ServerToClientEvents {
  [SocketEvent.Error]: (data: { message: string }) => void;
  [SocketEvent.NotificationNew]: (data: any) => void;
}

export type AuthenticatedSocket = Socket<
  Record<string, never>,
  ServerToClientEvents,
  Record<string, never>,
  { user?: JwtPayloadType }
>;
