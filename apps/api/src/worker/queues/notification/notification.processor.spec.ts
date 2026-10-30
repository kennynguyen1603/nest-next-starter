import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';

import { Job as JobName } from '@/constants/job.constant';
import { NotificationType } from '@/notifications/notifications.enum';
import { NotificationsService } from '@/notifications/notifications.service';
import { NotificationProcessor } from './notification.processor';
import { NotificationJobUnion } from './notification.type';

const mockNotificationsService = {
  create: jest.fn().mockResolvedValue({ id: 'n-1' }),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

const makeJob = (name: string, data: object = {}) =>
  ({
    id: 'job-1',
    name,
    data,
    attemptsMade: 2,
    failedReason: 'boom',
  }) as unknown as NotificationJobUnion;

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: NotificationsService, useValue: mockNotificationsService },
        {
          provide: getLoggerToken(NotificationProcessor.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    processor = module.get(NotificationProcessor);
  });

  describe('process', () => {
    it('persists create-notification jobs through NotificationsService', async () => {
      const data = {
        userId: 'u-1',
        type: NotificationType.SYSTEM,
        title: 'Hello',
        message: 'World',
      };

      await processor.process(
        makeJob(JobName.Notification.CreateNotification, data),
      );

      expect(mockNotificationsService.create).toHaveBeenCalledWith(data);
    });

    it('throws on an unknown job name', async () => {
      await expect(processor.process(makeJob('unknown'))).rejects.toThrow(
        'Unhandled job type: unknown',
      );
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('propagates persistence failures so BullMQ retries the job', async () => {
      mockNotificationsService.create.mockRejectedValueOnce(new Error('db'));

      await expect(
        processor.process(makeJob(JobName.Notification.CreateNotification)),
      ).rejects.toThrow('db');
    });
  });

  describe('worker events', () => {
    const job = makeJob(JobName.Notification.CreateNotification);

    it('logs completion at info level', () => {
      processor.onCompleted(job);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { jobId: 'job-1', type: JobName.Notification.CreateNotification },
        'Notification job completed',
      );
    });

    it('logs failures with the failure reason', () => {
      processor.onFailed(job, new Error('boom'));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ jobId: 'job-1', reason: 'boom' }),
        expect.any(String),
      );
    });

    it('logs failures that happen without a job', () => {
      const err = new Error('lock lost');
      processor.onFailed(undefined, err);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err, jobId: undefined }),
        expect.any(String),
      );
    });

    it('logs stalled jobs by id at error level', () => {
      processor.onStalled('job-1');

      expect(mockLogger.error).toHaveBeenCalledWith(
        { jobId: 'job-1' },
        expect.any(String),
      );
    });

    it('logs worker errors with the error object', () => {
      const err = new Error('redis gone');
      processor.onError(err);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { err },
        expect.any(String),
      );
    });
  });
});
