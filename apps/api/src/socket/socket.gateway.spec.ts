import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { SocketGateway } from './socket.gateway';
import { CacheService } from '@/shared/cache/cache.service';
import { SocketEvent } from './types/socket-event.enum';
import { AuthenticatedSocket } from './types/authenticated-socket.type';
import { RoleEnum } from '@/roles/roles.enum';

function makeSocket(token?: string): jest.Mocked<AuthenticatedSocket> {
  return {
    handshake: { auth: { token } },
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
const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
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

    it('joins user room and caches socket id on valid token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockCacheService.get.mockResolvedValue(null);
      const socket = makeSocket('valid-token');
      await gateway.handleConnection(socket);
      expect(socket.data.user).toEqual(jwtPayload);
      expect(socket.join).toHaveBeenCalledWith('user:user-id');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        { key: 'UserSocketClients', args: ['user-id'] },
        ['socket-id-1'],
        expect.objectContaining({ ttl: expect.any(Number) }),
      );
    });

    it('appends socket id to existing cache entries', async () => {
      mockJwtService.verifyAsync.mockResolvedValue(jwtPayload);
      mockCacheService.get.mockResolvedValue(['socket-id-existing']);
      const socket = makeSocket('valid-token');
      await gateway.handleConnection(socket);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        { key: 'UserSocketClients', args: ['user-id'] },
        ['socket-id-existing', 'socket-id-1'],
        expect.any(Object),
      );
    });
  });

  describe('handleDisconnect', () => {
    it('does nothing when socket had no authenticated user', async () => {
      const socket = makeSocket();
      await gateway.handleDisconnect(socket);
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });

    it('removes socket id from cache on disconnect', async () => {
      mockCacheService.get.mockResolvedValue(['socket-id-1', 'socket-id-2']);
      const socket = makeSocket();
      socket.data.user = jwtPayload as any;
      await gateway.handleDisconnect(socket);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        { key: 'UserSocketClients', args: ['user-id'] },
        ['socket-id-2'],
        expect.any(Object),
      );
    });

    it('deletes cache key when last socket disconnects', async () => {
      mockCacheService.get.mockResolvedValue(['socket-id-1']);
      const socket = makeSocket();
      socket.data.user = jwtPayload as any;
      await gateway.handleDisconnect(socket);
      expect(mockCacheService.delete).toHaveBeenCalledWith({
        key: 'UserSocketClients',
        args: ['user-id'],
      });
    });
  });
});
