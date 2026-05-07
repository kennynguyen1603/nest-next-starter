import { AppConfig } from '@/config/app/app-config.type';
import { DatabaseConfig } from '@/config/database/database-config.type';
// import { RedisConfig } from '@/config/redis/redis-config.type';
import { AuthConfig } from '@/config/auth/auth-config.type';
import { MailConfig } from '@/config/mail/mail-config.type';
import { FileConfig } from '@/config/files/file-config.type';
// import { BullConfig } from '@/config/bull/bull-config.type';
// import { AwsConfig } from '@/config/aws/aws-config.types';
// import { GrafanaConfig } from '@/config/grafana/grafana.type';
// import { SentryConfig } from '@/config/sentry/sentry-config.type';
// import { ThrottlerConfig } from '@/config/throttler/throttler-config.type';

export type AllConfigType = {
  app: AppConfig;
  database: DatabaseConfig;
  // redis: RedisConfig;
  auth: AuthConfig;
  mail: MailConfig;
  file: FileConfig;
  // queue: BullConfig;
  // aws: AwsConfig;
  //   sentry: SentryConfig;
  //   throttler: ThrottlerConfig;
  //   grafana: GrafanaConfig;
};
