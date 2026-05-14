import { Module } from '@nestjs/common';
import { EmailQueueModule } from './email/email.module';

@Module({
  imports: [EmailQueueModule],
})
export class WorkerModule {}
