import { RedisConfig } from '@/config/redis/redis-config.type';
import redisConfig from '@/config/redis/redis.config';
import { registerAs } from '@nestjs/config';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
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

  @IsNumber()
  @IsOptional()
  QUEUE_FAILED_RETRY_ATTEMPTS?: number;
}

export function getConfig(): BullConfig {
  return {
    prefix: `${process.env.API_PREFIX ?? 'api'}:bull`,
    redis: redisConfig() as RedisConfig,
    defaultJobOptions: {
      removeOnComplete: process.env.QUEUE_REMOVE_ON_COMPLETE === 'true',
      removeOnFail: process.env.QUEUE_REMOVE_ON_FAIL === 'true',
      attempts: process.env.QUEUE_FAILED_RETRY_ATTEMPTS
        ? Number.parseInt(process.env.QUEUE_FAILED_RETRY_ATTEMPTS)
        : 0,
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
