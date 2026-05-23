import {
  Job as JobConstants,
  Queue as QueueName,
} from '@/constants/job.constant';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CreateNotificationJob } from './notification.type';

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue(QueueName.Notification)
    private readonly notificationQueue: Queue,
    @InjectPinoLogger(NotificationQueueService.name)
    private readonly logger: PinoLogger,
  ) {}

  async addCreateNotificationJob(
    data: CreateNotificationJob['data'],
  ): Promise<void> {
    const job = await this.notificationQueue.add(
      JobConstants.Notification.CreateNotification,
      data,
    );
    this.logger.info(
      { jobId: job.id, userId: data.userId, type: data.type },
      'Create-notification job enqueued',
    );
  }
}
