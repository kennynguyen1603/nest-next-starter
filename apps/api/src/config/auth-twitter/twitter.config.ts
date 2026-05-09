import { registerAs } from '@nestjs/config';

import { IsOptional, IsString } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { TwitterConfig } from './twitter-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  TWITTER_CLIENT_ID!: string;

  @IsString()
  @IsOptional()
  TWITTER_CLIENT_SECRET!: string;
}

export default registerAs<TwitterConfig>('twitter', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  };
});
