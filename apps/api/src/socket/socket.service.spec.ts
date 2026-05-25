import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken, PinoLogger } from 'nestjs-pino';
import { SocketService } from './socket.service';
import { SocketGateway } from './socket.gateway';

const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

const mockGateway: { server: typeof mockServer | undefined } = {
  server: mockServer,
};

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as PinoLogger;

describe('SocketService', () => {
  let service: SocketService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketService,
        { provide: SocketGateway, useValue: mockGateway },
        { provide: getLoggerToken(SocketService.name), useValue: mockLogger },
      ],
    }).compile();
    service = module.get(SocketService);
  });

  describe('emitToUser', () => {
    it('emits event to user:{userId} room', () => {
      service.emitToUser('user-123', 'notification:new', { id: 'n1' });
      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('notification:new', {
        id: 'n1',
      });
    });

    it('skips emit and warns when server is not ready', () => {
      mockGateway.server = undefined;
      service.emitToUser('user-123', 'notification:new', { id: 'n1' });
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      mockGateway.server = mockServer;
    });
  });

  describe('emitToRoom', () => {
    it('emits event to the given room', () => {
      service.emitToRoom('chat:room-42', 'chat:message', { content: 'hi' });
      expect(mockServer.to).toHaveBeenCalledWith('chat:room-42');
      expect(mockServer.emit).toHaveBeenCalledWith('chat:message', {
        content: 'hi',
      });
    });

    it('skips emit and warns when server is not ready', () => {
      mockGateway.server = undefined;
      service.emitToRoom('chat:room-42', 'chat:message', { content: 'hi' });
      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      mockGateway.server = mockServer;
    });
  });
});
