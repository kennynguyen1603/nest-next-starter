import { Logger } from '@nestjs/common';
import { LoggerLevel, Logger as NodeMailerLogger } from 'nodemailer/lib/shared';

class MailerCustomLogger implements NodeMailerLogger {
  static getInstance(logLevels?: LoggerLevel[]): MailerCustomLogger {
    const logger = new Logger(MailerCustomLogger.name);
    return new MailerCustomLogger(logger, logLevels);
  }

  constructor(
    private readonly logger: Logger,
    private readonly logLevels: LoggerLevel[] = [
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal',
    ],
  ) {}

  level(_level: LoggerLevel): void {}

  trace(...params: unknown[]): void {
    if (this.logLevels.includes('trace')) {
      this.logger.verbose(
        this.getPrefix(params[0]) + String(params[1]),
        ...(params.slice(2) as string[]),
      );
    }
  }

  debug(...params: unknown[]): void {
    if (this.logLevels.includes('debug')) {
      this.logger.debug(
        this.getPrefix(params[0]) + String(params[1]),
        ...(params.slice(2) as string[]),
      );
    }
  }

  info(...params: unknown[]): void {
    if (this.logLevels.includes('info')) {
      this.logger.log(
        this.getPrefix(params[0]) + String(params[1]),
        ...(params.slice(2) as string[]),
      );
    }
  }

  warn(...params: unknown[]): void {
    if (this.logLevels.includes('warn')) {
      this.logger.warn(
        this.getPrefix(params[0]) + String(params[1]),
        ...(params.slice(2) as string[]),
      );
    }
  }

  error(...params: unknown[]): void {
    if (this.logLevels.includes('error')) {
      this.logger.error(
        this.getPrefix(params[0]) + String(params[1]),
        ...(params.slice(2) as string[]),
      );
    }
  }

  fatal(...params: unknown[]): void {
    if (this.logLevels.includes('fatal')) {
      this.logger.error(
        this.getPrefix(params[0]) + String(params[1]),
        ...(params.slice(2) as string[]),
      );
    }
  }

  log(message: string) {
    if (this.logLevels.includes('info')) {
      this.logger.log(message);
    }
  }

  private getPrefix(entry: unknown) {
    let prefix = '';
    if (entry && typeof entry === 'object') {
      const e = entry as Record<string, unknown>;
      if (e['tnx'] === 'server') {
        prefix = 'S: ';
      } else if (e['tnx'] === 'client') {
        prefix = 'C: ';
      }

      if (typeof e['sid'] === 'string' || typeof e['sid'] === 'number') {
        prefix = '[' + e['sid'] + '] ' + prefix;
      }

      if (typeof e['cid'] === 'string' || typeof e['cid'] === 'number') {
        prefix = '[#' + e['cid'] + '] ' + prefix;
      }
    }

    return prefix;
  }
}

export default MailerCustomLogger;
