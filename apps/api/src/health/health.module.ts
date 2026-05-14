import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { AuthModule } from '@/auth/auth.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, AuthModule],
  controllers: [HealthController],
})
export class HealthModule {}
