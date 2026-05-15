import { registerAs } from '@nestjs/config';
import { AppConfig } from './app-config.type';
import validateConfig from '@/utils/validate-config';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { LogService } from '@/constants/app.constant';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariablesValidator {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV?: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsOptional()
  APP_PORT?: number;

  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_DOMAIN?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  BACKEND_DOMAIN?: string;

  @IsString()
  @IsOptional()
  API_PREFIX?: string;

  @IsString()
  @IsOptional()
  APP_FALLBACK_LANGUAGE?: string;

  @IsString()
  @IsOptional()
  APP_HEADER_LANGUAGE?: string;

  @IsBoolean()
  @IsOptional()
  APP_DEBUG?: boolean;

  @IsBoolean()
  @IsOptional()
  APP_LOGGING?: boolean;

  @IsString()
  @IsOptional()
  APP_LOG_LEVEL?: string;

  @IsString()
  @IsEnum(LogService)
  @IsOptional()
  APP_LOG_SERVICE?: string;
}

export function getConfig(): AppConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'app',
    workingDirectory: process.env.PWD || process.cwd(),
    frontendDomain: process.env.FRONTEND_DOMAIN,
    backendDomain: process.env.BACKEND_DOMAIN ?? 'http://localhost',
    port: process.env.APP_PORT
      ? parseInt(process.env.APP_PORT, 10)
      : process.env.PORT
        ? parseInt(process.env.PORT, 10)
        : 3000,
    apiPrefix: process.env.API_PREFIX || 'api',
    appPrefix: process.env.APP_PREFIX || process.env.APP_NAME || 'app',
    corsOrigin: process.env.FRONTEND_DOMAIN,
    fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
    headerLanguage: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
    debug: process.env.APP_DEBUG === 'true',
    appLogging: process.env.APP_LOGGING === 'true',
    logLevel: process.env.APP_LOG_LEVEL || 'warn',
    logService: process.env.APP_LOG_SERVICE || LogService.Console,
  };
}

export default registerAs<AppConfig>('app', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
