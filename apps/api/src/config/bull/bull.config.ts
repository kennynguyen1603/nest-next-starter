import { RedisConfig } from '@/config/redis/redis-config.type';
import redisConfig from '@/config/redis/redis.config';
import { registerAs } from '@nestjs/config';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';
import { BullConfig } from './bull-config.type';
import validateConfig from '@/utils/validate-config';

export const BULL_BOARD_PATH = '/queues';

class EnvironmentVariablesValidator {
  @IsBoolean()
  @IsOptional()
  QUEUE_REMOVE_ON_COMPLETE?: boolean;

  @IsBoolean()
  @IsOptional()
  QUEUE_REMOVE_ON_FAIL?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  QUEUE_FAILED_RETRY_ATTEMPTS?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  EMAIL_QUEUE_CONCURRENCY?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  NOTIFICATION_QUEUE_CONCURRENCY?: number;
}

// @Processor options are evaluated at import time, before ConfigModule runs,
// so worker concurrency is read straight from the (already loaded) env.
export function getQueueConcurrency(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getConfig(): BullConfig {
  return {
    prefix: `${process.env.API_PREFIX ?? 'api'}:bull`,
    redis: redisConfig() as RedisConfig,
    defaultJobOptions: {
      // Keep a bounded history instead of letting Redis grow without limit.
      removeOnComplete:
        process.env.QUEUE_REMOVE_ON_COMPLETE === 'true'
          ? true
          : { count: 1000 },
      removeOnFail:
        process.env.QUEUE_REMOVE_ON_FAIL === 'true' ? true : { count: 5000 },
      attempts: process.env.QUEUE_FAILED_RETRY_ATTEMPTS
        ? Number.parseInt(process.env.QUEUE_FAILED_RETRY_ATTEMPTS, 10)
        : 3,
      backoff: {
        type: 'exponential', // With an exponential backoff, it will retry after 2 ^ attempts * delay milliseconds
        delay: 1000,
      },
    },
  };
}

export default registerAs<BullConfig>('queue', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
