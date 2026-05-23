import {
  Job as JobConstants,
  Queue as QueueName,
} from '@/constants/job.constant';
import { NotificationsService } from '@/notifications/notifications.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotificationJobUnion } from './notification.type';

const { Notification: NotificationJob } = JobConstants;

@Processor(QueueName.Notification, {
  concurrency: 5,
  drainDelay: 300,
  stalledInterval: 300000,
  removeOnComplete: { age: 86400, count: 100 },
})
export class NotificationProcessor extends WorkerHost {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectPinoLogger(NotificationProcessor.name)
    private readonly logger: PinoLogger,
  ) {
    super();
  }

  async process(job: NotificationJobUnion, _token?: string): Promise<void> {
    this.logger.debug(
      { jobId: job.id, type: job.name },
      'Processing notification job',
    );

    switch (job.name) {
      case NotificationJob.CreateNotification:
        await this.notificationsService.create(job.data);
        return;
      default: {
        const _exhaustive: never = job as never;
        throw new Error(
          `Unhandled job type: ${(_exhaustive as unknown as Job).name}`,
        );
      }
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.info(
      { jobId: job.id, type: job.name },
      'Notification job completed',
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
      },
      'Notification job failed',
    );
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    this.logger.error(
      { jobId: job.id, type: job.name },
      'Notification job stalled',
    );
  }

  @OnWorkerEvent('error')
  onError(job: Job, error: Error) {
    this.logger.error(
      { jobId: job.id, err: error },
      'Notification worker error',
    );
  }
}
