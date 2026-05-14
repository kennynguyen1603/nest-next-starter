import { Queue as QueueName } from '@/constants/job.constant';
import { MailModule } from '@/mail/mail.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailQueueEvents } from './email.events';
import { EmailProcessor } from './email.processor';
import { EmailQueueService } from './email.service';

@Module({
  imports: [
    MailModule,
    BullModule.registerQueue({
      name: QueueName.Email,
      streams: { events: { maxLen: 1000 } },
      defaultJobOptions: {
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    }),
    BullBoardModule.forFeature({
      name: QueueName.Email,
      adapter: BullMQAdapter,
    }),
  ],
  providers: [EmailQueueService, EmailProcessor, EmailQueueEvents],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}
