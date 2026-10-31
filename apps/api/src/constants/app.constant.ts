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
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body.token',
  'req.body.refreshToken',
  'req.body.email',
  'req.body.password',
  'req.body.oldPassword',
  'req.body.hash',
];

export const SWAGGER_PATH = '/docs';

export const DEFAULT_PAGE_LIMIT = 10;
export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_CURRENT_PAGE = 1;
