import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { resolveSocketCorsOrigin, SocketGateway } from './socket.gateway';
import { SessionService } from '@/session/session.service';
import { SocketEvent } from './types/socket-event.enum';
import { AuthenticatedSocket } from './types/authenticated-socket.type';
import { RoleEnum } from '@/roles/roles.enum';

function makeSocket(
  token?: string,
  query: Record<string, string> = {},
): jest.Mocked<AuthenticatedSocket> {
  return {
    handshake: { auth: { token }, query },
    data: {},
    id: 'socket-id-1',
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as jest.Mocked<AuthenticatedSocket>;
}

const jwtPayload = {
  id: 'user-id',
  roles: [RoleEnum.USER],
  permissions: [],
  sessionId: 'session-id',
  iat: 0,
  exp: 9999999999,
};

const mockJwtService = { verifyAsync: jest.fn() };
const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};
const mockSessionService = {
  isActiveForUser: jest.fn(),
};
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as PinoLogger;

describe('SocketGateway', () => {
  let gateway: SocketGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSessionService.isActiveForUser.mockResolvedValue(true);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: getLoggerToken(SocketGateway.name), useValue: mockLogger },
      ],
    }).compile();
    gateway = module.get(SocketGateway);
  });

  describe('handleConnection', () => {
    it('disconnects when no token provided', async () => {
      const socket = makeSocket(undefined);
      await gateway.handleConnection(socket);
      expect(socket.emit).toHaveBeenCalledWith(SocketEvent.Error, {
        message: 'Unauthorized',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects when JWT verification fails', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      const socket = makeSocket('bad-token');
      await gateway.handleConnection(socket);
      expect(socket.emit).toHaveBeenCalledWith(SocketEvent.Error, {
        message: 'Unauthorized',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('rejects a token passed only in the query string', async () => {
      const socket = makeSocket(undefined, { token: 'valid-token' });
      await gateway.handleConnection(socket);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects when the session is revoked or not owned by the user', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockSessionService.isActiveForUser.mockResolvedValue(false);
      const socket = makeSocket('valid-token');
      await gateway.handleConnection(socket);
      expect(mockSessionService.isActiveForUser).toHaveBeenCalledWith(
        'session-id',
        'user-id',
      );
      expect(socket.emit).toHaveBeenCalledWith(SocketEvent.Error, {
        message: 'Unauthorized',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('disconnects when the payload has no sessionId', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        ...jwtPayload,
        sessionId: undefined,
      });
      const socket = makeSocket('valid-token');
      await gateway.handleConnection(socket);
      expect(mockSessionService.isActiveForUser).not.toHaveBeenCalled();
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('joins the user room on valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      const socket = makeSocket('valid-token');
      await gateway.handleConnection(socket);
      expect(socket.data.user).toEqual(jwtPayload);
      expect(socket.join).toHaveBeenCalledWith('user:user-id');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('resolveSocketCorsOrigin', () => {
    it('returns the configured frontend and admin origins', () => {
      expect(
        resolveSocketCorsOrigin({
          FRONTEND_DOMAIN: 'https://app.example.com',
          ADMIN_DOMAIN: 'https://admin.example.com',
        }),
      ).toEqual(['https://app.example.com', 'https://admin.example.com']);
    });

    it('skips unset origins', () => {
      expect(
        resolveSocketCorsOrigin({ FRONTEND_DOMAIN: 'https://app.example.com' }),
      ).toEqual(['https://app.example.com']);
    });

    it('fails closed when no origin is configured', () => {
      expect(resolveSocketCorsOrigin({})).toBe(false);
    });
  });

  describe('handleDisconnect', () => {
    it('does nothing when socket had no authenticated user', () => {
      const socket = makeSocket();
      gateway.handleDisconnect(socket);
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('logs the disconnect of an authenticated socket', () => {
      const socket = makeSocket();
      socket.data.user = jwtPayload as any;
      gateway.handleDisconnect(socket);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { userId: 'user-id', socketId: 'socket-id-1' },
        'Socket disconnected',
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('disconnects only the sockets held by this instance', () => {
      const disconnectSockets = jest.fn();
      const clusterDisconnect = jest.fn();
      gateway.server = {
        local: { disconnectSockets },
        disconnectSockets: clusterDisconnect,
      } as any;
      gateway.onModuleDestroy();
      expect(disconnectSockets).toHaveBeenCalledWith(true);
      expect(clusterDisconnect).not.toHaveBeenCalled();
    });

    it('is a no-op before the server is created', () => {
      gateway.server = undefined as any;
      expect(() => gateway.onModuleDestroy()).not.toThrow();
    });
  });
});
