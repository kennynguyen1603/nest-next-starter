import { registerAs } from '@nestjs/config';

import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  ValidateIf,
  IsBoolean,
} from 'class-validator';
import { DatabaseConfig } from '@/config/database/database-config.type';
import validateConfig from '@/utils/validate-config';

class EnvironmentVariablesValidator {
  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) => !!envValues.DATABASE_URL,
  )
  @IsString()
  DATABASE_URL?: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) => !envValues.DATABASE_URL,
  )
  @IsString()
  DATABASE_TYPE!: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) => !envValues.DATABASE_URL,
  )
  @IsString()
  DATABASE_HOST!: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) => !envValues.DATABASE_URL,
  )
  @IsInt()
  @Min(0)
  @Max(65535)
  DATABASE_PORT!: number;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) => !envValues.DATABASE_URL,
  )
  @IsString()
  DATABASE_PASSWORD!: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) => !envValues.DATABASE_URL,
  )
  @IsString()
  DATABASE_NAME!: string;

  @ValidateIf(
    (envValues: EnvironmentVariablesValidator) => !envValues.DATABASE_URL,
  )
  @IsString()
  DATABASE_USERNAME!: string;

  @IsBoolean()
  @IsOptional()
  DATABASE_SYNCHRONIZE?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  DATABASE_MAX_CONNECTIONS?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  DATABASE_MIN_CONNECTIONS?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  DATABASE_IDLE_TIMEOUT_MS?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  DATABASE_CONNECTION_TIMEOUT_MS?: number;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL_ENABLED?: boolean;

  @IsBoolean()
  @IsOptional()
  DATABASE_REJECT_UNAUTHORIZED?: boolean;

  @IsString()
  @IsOptional()
  DATABASE_CA?: string;

  @IsString()
  @IsOptional()
  DATABASE_KEY?: string;

  @IsString()
  @IsOptional()
  DATABASE_CERT?: string;
}

export default registerAs<DatabaseConfig>('database', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    isDocumentDatabase: ['mongodb'].includes(process.env.DATABASE_TYPE ?? ''),
    url: process.env.DATABASE_URL,
    type: process.env.DATABASE_TYPE,
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT
      ? parseInt(process.env.DATABASE_PORT, 10)
      : 5432,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
    username: process.env.DATABASE_USERNAME,
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
    // Pool is per process: total connections = instances x maxConnections,
    // so keep the default small and size it against the DB server's limit.
    maxConnections: process.env.DATABASE_MAX_CONNECTIONS
      ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
      : 10,
    minConnections: process.env.DATABASE_MIN_CONNECTIONS
      ? parseInt(process.env.DATABASE_MIN_CONNECTIONS, 10)
      : 0,
    idleTimeoutMs: process.env.DATABASE_IDLE_TIMEOUT_MS
      ? parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS, 10)
      : 30000,
    connectionTimeoutMs: process.env.DATABASE_CONNECTION_TIMEOUT_MS
      ? parseInt(process.env.DATABASE_CONNECTION_TIMEOUT_MS, 10)
      : 10000,
    sslEnabled: process.env.DATABASE_SSL_ENABLED === 'true',
    rejectUnauthorized: process.env.DATABASE_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DATABASE_CA,
    key: process.env.DATABASE_KEY,
    cert: process.env.DATABASE_CERT,
  };
});
