import {
  Job as JobConstants,
  Queue as QueueName,
} from '@/constants/job.constant';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    private readonly emailQueueService: EmailQueueService,
    @InjectPinoLogger(EmailProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: EmailJobUnion, _token?: string): Promise<void> {
    this.logger.debug(
      { jobId: job.id, type: job.name },
      'Processing email job',
    );

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
    this.logger.debug(
      { jobId: job.id, type: job.name, attempt: job.attemptsMade },
      'Email job active',
    );
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job) {
    this.logger.debug(
      { jobId: job.id, type: job.name, progress: job.progress },
      'Email job progress',
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.info(
      { jobId: job.id, type: job.name, attempt: job.attemptsMade },
      'Email job completed',
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    this.logger.error(
      {
        jobId: job.id,
        type: job.name,
        attempt: job.attemptsMade,
        reason: job.failedReason,
        stacktrace: job.stacktrace,
      },
      'Email job failed',
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    this.logger.error(
      { jobId: job.id, type: job.name, attempt: job.attemptsMade },
      'Email job stalled',
    );
  }

  @OnWorkerEvent('error')
  onError(job: Job, error: Error) {
    this.logger.error({ jobId: job.id, err: error }, 'Email worker error');
  }
}
