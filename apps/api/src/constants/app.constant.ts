export enum Environment {
  Local = 'local',
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

export enum LogService {
  Console = 'console',
  GoogleLogging = 'google-logging',
  AwsCloudWatch = 'aws-cloudwatch',
}

export enum Order {
  Asc = 'asc',
  Desc = 'desc',
}

// Redact value of these paths from logs
export const loggingRedactPaths = [
  'req.headers.authorization',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.email',
  'req.body.password',
  'req.body.oldPassword',
];

export const IS_PUBLIC = 'is-public';
export const IS_AUTH_OPTIONAL = 'is-auth-optional';

export const DEFAULT_PAGE_LIMIT = 10;
export const DEFAULT_CURRENT_PAGE = 1;
export const SYSTEM_USER_ID = 'system';
