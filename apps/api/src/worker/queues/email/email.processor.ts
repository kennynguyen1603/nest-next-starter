import {
  Job as JobConstants,
  Queue as QueueName,
} from '@/constants/job.constant';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailQueueService } from './email.service';
import { EmailJobUnion } from './email.type';

const { Email: EmailJob } = JobConstants;

@Processor(QueueName.Email, {
  concurrency: 1,
  drainDelay: 300,
  stalledInterval: 300000,
  removeOnComplete: { age: 86400, count: 100 },
  limiter: { max: 1, duration: 150 },
})
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailQueueService: EmailQueueService) {
    super();
  }

  async process(job: EmailJobUnion, _token?: string): Promise<void> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case EmailJob.EmailVerification:
        return this.emailQueueService.processEmailVerification(job.data);
      case EmailJob.ConfirmNewEmail:
        return this.emailQueueService.processConfirmNewEmail(job.data);
      case EmailJob.ResetPassword:
        return this.emailQueueService.processResetPassword(job.data);
      default: {
        const exhaustive: never = job;
        throw new Error(`Unhandled job type: ${(exhaustive as Job).name}`);
      }
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job) {
    this.logger.debug(
      `Job ${job.id} is ${JSON.stringify(job.progress)}% complete`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} has been completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(`Job ${job.id} failed: ${job.failedReason}`);
    this.logger.error(job.stacktrace);
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    this.logger.error(`Job ${job.id} has been stalled`);
  }

  @OnWorkerEvent('error')
  onError(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} error: ${error.message}`);
  }
}
