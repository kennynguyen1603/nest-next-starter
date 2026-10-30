import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';

import { Job as JobName } from '@/constants/job.constant';
import { EmailProcessor } from './email.processor';
import { EmailQueueService } from './email.service';
import { EmailJobUnion } from './email.type';

const mockEmailQueueService = {
  processEmailVerification: jest.fn().mockResolvedValue(undefined),
  processConfirmNewEmail: jest.fn().mockResolvedValue(undefined),
  processResetPassword: jest.fn().mockResolvedValue(undefined),
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
    attemptsMade: 1,
    failedReason: 'boom',
    stacktrace: ['at x'],
  }) as unknown as EmailJobUnion;

describe('EmailProcessor', () => {
  let processor: EmailProcessor;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: EmailQueueService, useValue: mockEmailQueueService },
        { provide: getLoggerToken(EmailProcessor.name), useValue: mockLogger },
      ],
    }).compile();

    processor = module.get(EmailProcessor);
  });

  describe('process', () => {
    it('dispatches email verification jobs', async () => {
      const data = { email: 'a@b.com', hash: 'h' };
      await processor.process(makeJob(JobName.Email.EmailVerification, data));

      expect(
        mockEmailQueueService.processEmailVerification,
      ).toHaveBeenCalledWith(data);
      expect(
        mockEmailQueueService.processConfirmNewEmail,
      ).not.toHaveBeenCalled();
      expect(mockEmailQueueService.processResetPassword).not.toHaveBeenCalled();
    });

    it('dispatches confirm-new-email jobs', async () => {
      const data = { email: 'new@b.com', hash: 'h' };
      await processor.process(makeJob(JobName.Email.ConfirmNewEmail, data));

      expect(mockEmailQueueService.processConfirmNewEmail).toHaveBeenCalledWith(
        data,
      );
    });

    it('dispatches reset-password jobs', async () => {
      const data = { email: 'a@b.com', hash: 'h', tokenExpires: 123 };
      await processor.process(makeJob(JobName.Email.ResetPassword, data));

      expect(mockEmailQueueService.processResetPassword).toHaveBeenCalledWith(
        data,
      );
    });

    it('throws on an unknown job name so BullMQ marks the job failed', async () => {
      await expect(processor.process(makeJob('unknown'))).rejects.toThrow(
        'Unhandled job type: unknown',
      );
    });

    it('propagates mail failures so the job can be retried', async () => {
      mockEmailQueueService.processResetPassword.mockRejectedValueOnce(
        new Error('smtp down'),
      );

      await expect(
        processor.process(makeJob(JobName.Email.ResetPassword)),
      ).rejects.toThrow('smtp down');
    });
  });

  describe('worker events', () => {
    const job = makeJob(JobName.Email.EmailVerification);

    it('logs completion at info level', () => {
      processor.onCompleted(job);

      expect(mockLogger.info).toHaveBeenCalledWith(
        { jobId: 'job-1', type: JobName.Email.EmailVerification, attempt: 1 },
        'Email job completed',
      );
    });

    it('logs failures with reason and stacktrace', () => {
      processor.onFailed(job, new Error('boom'));

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          reason: 'boom',
          stacktrace: ['at x'],
        }),
        'Email job failed',
      );
    });

    it('logs failures that happen without a job', () => {
      const err = new Error('lock lost');
      processor.onFailed(undefined, err);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err, jobId: undefined }),
        'Email job failed',
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
        'Email worker error',
      );
    });

    it('logs active and progress at debug level', () => {
      processor.onActive(job);
      processor.onProgress(job);

      expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    });
  });
});
