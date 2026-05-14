import { registerAs } from '@nestjs/config';

import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RedisConfig } from './redis-config.type';
import validateConfig from '@/utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  REDIS_PORT?: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsBoolean()
  @IsOptional()
  REDIS_TLS?: boolean;

  @IsBoolean()
  @IsOptional()
  REDIS_REJECT_UNAUTHORIZED?: boolean;

  @IsString()
  @IsOptional()
  REDIS_CA?: string;

  @IsString()
  @IsOptional()
  REDIS_KEY?: string;

  @IsString()
  @IsOptional()
  REDIS_CERT?: string;
}

export function getConfig(): RedisConfig {
  return {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD,
    tls:
      process.env.REDIS_TLS === 'true'
        ? {
            rejectUnauthorized:
              process.env.REDIS_REJECT_UNAUTHORIZED === 'true',
            ca: process.env.REDIS_CA ?? undefined,
            key: process.env.REDIS_KEY ?? undefined,
            cert: process.env.REDIS_CERT ?? undefined,
          }
        : undefined,
  };
}

export default registerAs<RedisConfig>('redis', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
