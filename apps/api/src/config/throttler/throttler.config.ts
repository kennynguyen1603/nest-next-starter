import { registerAs } from '@nestjs/config';
import { seconds } from '@nestjs/throttler';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import process from 'node:process';
import { ThrottlerConfig } from './throttler-config.type';
import validateConfig from '@/utils/validate-config';

class ThrottlerValidator {
  @IsBoolean()
  @IsOptional()
  THROTTLER_ENABLED?: boolean;

  @IsNumber()
  @IsOptional()
  THROTTLER_LIMIT?: number;

  @IsNumber()
  @IsOptional()
  THROTTLER_TTL?: number;
}

export function getConfig(): ThrottlerConfig {
  const enabled = process.env.THROTTLER_ENABLED !== 'false';
  return {
    enabled: enabled,
    limit: Number.parseInt(process.env.THROTTLER_LIMIT || '3'),
    ttl: enabled
      ? seconds(Number.parseInt(process.env.THROTTLER_TTL || '1'))
      : 0,
  };
}

export default registerAs<ThrottlerConfig>('throttler', () => {
  validateConfig(process.env, ThrottlerValidator);
  return getConfig();
});
