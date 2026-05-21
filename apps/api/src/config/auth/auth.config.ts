import { registerAs } from '@nestjs/config';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { AuthConfig } from './auth-config.type';
import ms from 'ms';

class EnvironmentVariablesValidator {
  @IsString()
  AUTH_JWT_SECRET!: string;

  @IsString()
  AUTH_JWT_TOKEN_EXPIRES_IN!: string;

  @IsString()
  AUTH_REFRESH_SECRET!: string;

  @IsString()
  AUTH_REFRESH_TOKEN_EXPIRES_IN!: string;

  @IsString()
  AUTH_FORGOT_SECRET!: string;

  @IsString()
  AUTH_FORGOT_TOKEN_EXPIRES_IN!: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_SECRET!: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN!: string;

  @IsString()
  @IsOptional()
  AUTH_RESET_PASSWORD_COOLDOWN?: string;

  @IsString()
  @IsOptional()
  BASIC_AUTH_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  BASIC_AUTH_PASSWORD!: string;
}

export function getConfig(): AuthConfig {
  return {
    secret: process.env.AUTH_JWT_SECRET,
    expires: process.env.AUTH_JWT_TOKEN_EXPIRES_IN as ms.StringValue,
    refreshSecret: process.env.AUTH_REFRESH_SECRET,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN as ms.StringValue,
    forgotSecret: process.env.AUTH_FORGOT_SECRET,
    forgotExpires: process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN as ms.StringValue,
    confirmEmailSecret: process.env.AUTH_CONFIRM_EMAIL_SECRET,
    confirmEmailExpires: process.env
      .AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN as ms.StringValue,
    resetPasswordCooldown: (process.env.AUTH_RESET_PASSWORD_COOLDOWN ??
      '60s') as ms.StringValue,
    basicAuth: {
      username: process.env.BASIC_AUTH_USERNAME as string,
      password: process.env.BASIC_AUTH_PASSWORD as string,
    },
  };
}

export default registerAs<AuthConfig>('auth', (): AuthConfig => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
