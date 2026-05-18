import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import { GrafanaConfig } from './grafana.type';
import validateConfig from '@/utils/validate-config';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  GRAFANA_USERNAME?: string;

  @IsString()
  @IsOptional()
  GRAFANA_PASSWORD?: string;
}

export function getConfig(): GrafanaConfig {
  return {
    username: process.env.GRAFANA_USERNAME ?? 'admin',
    password: process.env.GRAFANA_PASSWORD ?? 'admin',
  };
}

export default registerAs<GrafanaConfig>('grafana', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
