import type { RedisConfig } from '../redis/redis-config.type';
import type { JobsOptions } from 'bullmq';

export type BullConfig = {
  prefix: string;
  redis: RedisConfig;
  defaultJobOptions: JobsOptions;
};
