import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue as QueueName } from '@/constants/job.constant';
import { NotificationQueueService } from './notification.service';
import { NotificationType } from '@/notifications/notifications.enum';

const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-id' }),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
} as unknown as PinoLogger;

describe('NotificationQueueService', () => {
  let service: NotificationQueueService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationQueueService,
        {
          provide: getQueueToken(QueueName.Notification),
          useValue: mockQueue,
        },
        {
          provide: getLoggerToken(NotificationQueueService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();
    service = module.get(NotificationQueueService);
  });

  it('enqueues a create-notification job', async () => {
    await service.addCreateNotificationJob({
      userId: 'user-id',
      type: NotificationType.SYSTEM,
      title: 'Hello',
      message: 'World',
    });
    expect(mockQueue.add).toHaveBeenCalledWith(
      'create-notification',
      expect.objectContaining({ userId: 'user-id' }),
    );
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
