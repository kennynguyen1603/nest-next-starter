import { Queue as QueueName } from '@/constants/job.constant';
import { NotificationsModule } from '@/notifications/notifications.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationQueueEvents } from './notification.events';
import { NotificationProcessor } from './notification.processor';
import { NotificationQueueService } from './notification.service';

@Module({
  imports: [
    NotificationsModule,
    BullModule.registerQueue({
      name: QueueName.Notification,
      streams: { events: { maxLen: 1000 } },
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    }),
    BullBoardModule.forFeature({
      name: QueueName.Notification,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [
    NotificationQueueService,
    NotificationProcessor,
    NotificationQueueEvents,
  ],
  exports: [NotificationQueueService],
})
export class NotificationQueueModule {}
