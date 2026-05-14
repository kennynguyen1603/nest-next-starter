import {
  Job as JobConstants,
  Queue as QueueName,
} from '@/constants/job.constant';
import { MailService } from '@/mail/mail.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  ConfirmNewEmailJob,
  EmailVerificationJob,
  ResetPasswordJob,
} from './email.type';

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue(QueueName.Email) private readonly emailQueue: Queue,
    private readonly mailService: MailService,
  ) {}

  // ─── Producer methods (called by other services to enqueue jobs) ──────────

  async addEmailVerificationJob(
    data: EmailVerificationJob['data'],
  ): Promise<void> {
    await this.emailQueue.add(JobConstants.Email.EmailVerification, data);
  }

  async addConfirmNewEmailJob(data: ConfirmNewEmailJob['data']): Promise<void> {
    await this.emailQueue.add(JobConstants.Email.ConfirmNewEmail, data);
  }

  async addResetPasswordJob(data: ResetPasswordJob['data']): Promise<void> {
    await this.emailQueue.add(JobConstants.Email.ResetPassword, data);
  }

  // ─── Consumer methods (called by EmailProcessor to send the actual mail) ──

  async processEmailVerification(
    data: EmailVerificationJob['data'],
  ): Promise<void> {
    await this.mailService.userSignUp({
      to: data.email,
      data: { hash: data.hash },
    });
  }

  async processConfirmNewEmail(
    data: ConfirmNewEmailJob['data'],
  ): Promise<void> {
    await this.mailService.confirmNewEmail({
      to: data.email,
      data: { hash: data.hash },
    });
  }

  async processResetPassword(data: ResetPasswordJob['data']): Promise<void> {
    await this.mailService.forgotPassword({
      to: data.email,
      data: { hash: data.hash, tokenExpires: data.tokenExpires },
    });
  }
}
