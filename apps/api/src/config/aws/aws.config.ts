import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';

import { AwsConfig } from './aws-config.types';
import validateConfig from '@/utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  AWS_REGION?: string;

  @IsString()
  @IsOptional()
  AWS_KEY?: string;

  @IsString()
  @IsOptional()
  AWS_SECRET?: string;

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET?: string;
}

export function getConfig(): AwsConfig {
  return {
    region: process.env.AWS_REGION,
    accessKey: process.env.AWS_KEY,
    secretKey: process.env.AWS_SECRET,
    bucket: process.env.AWS_S3_BUCKET,
  };
}

export default registerAs<AwsConfig>('aws', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
