import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';

import { Job as JobName, Queue as QueueName } from '@/constants/job.constant';
import { MailService } from '@/mail/mail.service';
import { EmailQueueService } from './email.service';

const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-id' }) };

const mockMailService = {
  userSignUp: jest.fn().mockResolvedValue(undefined),
  confirmNewEmail: jest.fn().mockResolvedValue(undefined),
  forgotPassword: jest.fn().mockResolvedValue(undefined),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
};

describe('EmailQueueService', () => {
  let service: EmailQueueService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        EmailQueueService,
        { provide: getQueueToken(QueueName.Email), useValue: mockQueue },
        { provide: MailService, useValue: mockMailService },
        {
          provide: getLoggerToken(EmailQueueService.name),
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get(EmailQueueService);
  });

  describe('producers', () => {
    it.each([
      ['addEmailVerificationJob', JobName.Email.EmailVerification],
      ['addConfirmNewEmailJob', JobName.Email.ConfirmNewEmail],
    ] as const)('%s enqueues %s', async (method, jobName) => {
      const data = { email: 'a@b.com', hash: 'h' };

      await service[method](data);

      expect(mockQueue.add).toHaveBeenCalledWith(jobName, data);
      expect(mockLogger.info).toHaveBeenCalledWith(
        { jobId: 'job-id', type: jobName },
        expect.any(String),
      );
    });

    it('addResetPasswordJob enqueues reset-password with tokenExpires', async () => {
      const data = { email: 'a@b.com', hash: 'h', tokenExpires: 123 };

      await service.addResetPasswordJob(data);

      expect(mockQueue.add).toHaveBeenCalledWith(
        JobName.Email.ResetPassword,
        data,
      );
    });

    it('propagates queue failures to the caller', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('redis down'));

      await expect(
        service.addEmailVerificationJob({ email: 'a@b.com', hash: 'h' }),
      ).rejects.toThrow('redis down');
    });
  });

  describe('consumers', () => {
    it('processEmailVerification sends the sign-up mail', async () => {
      await service.processEmailVerification({ email: 'a@b.com', hash: 'h' });

      expect(mockMailService.userSignUp).toHaveBeenCalledWith({
        to: 'a@b.com',
        data: { hash: 'h' },
      });
    });

    it('processConfirmNewEmail sends the confirm-new-email mail', async () => {
      await service.processConfirmNewEmail({ email: 'n@b.com', hash: 'h' });

      expect(mockMailService.confirmNewEmail).toHaveBeenCalledWith({
        to: 'n@b.com',
        data: { hash: 'h' },
      });
    });

    it('processResetPassword sends the forgot-password mail', async () => {
      await service.processResetPassword({
        email: 'a@b.com',
        hash: 'h',
        tokenExpires: 123,
      });

      expect(mockMailService.forgotPassword).toHaveBeenCalledWith({
        to: 'a@b.com',
        data: { hash: 'h', tokenExpires: 123 },
      });
    });
  });
});
