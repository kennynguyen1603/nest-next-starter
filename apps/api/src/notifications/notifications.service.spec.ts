import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getLoggerToken } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './infrastructure/persistence/notification.repository';
import { NotificationType } from './notifications.enum';
import { Notification } from './domain/notification';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/offset-pagination.dto';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  const n = new Notification();
  n.id = 'notif-id';
  n.userId = 'user-id';
  n.type = NotificationType.SYSTEM;
  n.title = 'Test';
  n.message = 'Body';
  n.data = null;
  n.isRead = false;
  n.readAt = null;
  n.createdAt = new Date();
  n.updatedAt = new Date();
  return Object.assign(n, overrides);
}

const mockRepo = {
  create: jest.fn(),
  findManyByUserId: jest.fn(),
  findById: jest.fn(),
  markAsRead: jest.fn(),
  remove: jest.fn(),
  countUnread: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as PinoLogger;

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationRepository, useValue: mockRepo },
        {
          provide: getLoggerToken(NotificationsService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();
    service = module.get(NotificationsService);
  });

  describe('findAll', () => {
    it('returns paginated notifications for user', async () => {
      const notifications = [makeNotification()];
      mockRepo.findManyByUserId.mockResolvedValue([notifications, 1]);
      const result = await service.findAll('user-id', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination).toBeInstanceOf(OffsetPaginationDto);
      expect(mockRepo.findManyByUserId).toHaveBeenCalledWith(
        'user-id',
        { page: 1, limit: 10 },
        undefined,
      );
    });
  });

  describe('markAsRead', () => {
    it('returns updated notification', async () => {
      const updated = makeNotification({ isRead: true });
      mockRepo.markAsRead.mockResolvedValue(updated);
      const result = await service.markAsRead('notif-id', 'user-id');
      expect(result.isRead).toBe(true);
    });

    it('throws NotFoundException when notification not found', async () => {
      mockRepo.markAsRead.mockResolvedValue(null);
      await expect(service.markAsRead('bad-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('calls repo remove when notification belongs to user', async () => {
      mockRepo.findById.mockResolvedValue(makeNotification());
      await service.remove('notif-id', 'user-id');
      expect(mockRepo.remove).toHaveBeenCalledWith('notif-id');
    });

    it('throws NotFoundException when notification not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.remove('bad-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when notification belongs to different user', async () => {
      mockRepo.findById.mockResolvedValue(
        makeNotification({ userId: 'other-user' }),
      );
      await expect(service.remove('notif-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
