import { AllConfigType } from '@/config/config.type';
import { loggingRedactPaths, LogService } from '@/constants/app.constant';
import { ConfigService } from '@nestjs/config';
import { type IncomingMessage, type ServerResponse } from 'http';
import { Params } from 'nestjs-pino';
import { GenReqId, Options, type ReqId } from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

type PinoRequest = IncomingMessage & { id?: ReqId };

// https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
const PinoLevelToGoogleLoggingSeverityLookup: Record<string, string> =
  Object.freeze({
    trace: 'DEBUG',
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARNING',
    error: 'ERROR',
    fatal: 'CRITICAL',
  });

const genReqId: GenReqId = (
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>,
) => {
  const existing = req.headers['x-request-id'];
  const id: ReqId = existing ?? uuidv4();
  res.setHeader(
    'X-Request-Id',
    typeof id === 'object' ? JSON.stringify(id) : String(id),
  );
  return id;
};

const reqId = (req: PinoRequest): string => {
  const id = req.id;
  if (id == null) return '*';
  if (typeof id === 'object') return JSON.stringify(id);
  return String(id);
};

const customSuccessMessage = (
  req: PinoRequest,
  res: ServerResponse<IncomingMessage>,
  responseTime: number,
) => {
  return `[${reqId(req)}] "${req.method} ${req.url}" ${res.statusCode} - "${req.headers['host']}" "${req.headers['user-agent']}" - ${responseTime} ms`;
};

const customReceivedMessage = (req: PinoRequest) => {
  return `[${reqId(req)}] "${req.method} ${req.url}"`;
};

const customErrorMessage = (
  req: PinoRequest,
  res: ServerResponse<IncomingMessage>,
  err: Error,
) => {
  return `[${reqId(req)}] "${req.method} ${req.url}" ${res.statusCode} - "${req.headers['host']}" "${req.headers['user-agent']}" - message: ${err.message}`;
};

function logServiceConfig(logService: LogService): Options {
  switch (logService) {
    case LogService.GoogleLogging:
      return googleLoggingConfig();
    case LogService.AwsCloudWatch:
      return cloudwatchLoggingConfig();
    case LogService.Console:
    default:
      return consoleLoggingConfig();
  }
}

function cloudwatchLoggingConfig(): Options {
  // FIXME: Implement AWS CloudWatch logging configuration
  return {
    messageKey: 'message',
  };
}

function googleLoggingConfig(): Options {
  return {
    messageKey: 'message',
    formatters: {
      level(label, number) {
        const severity =
          PinoLevelToGoogleLoggingSeverityLookup[label] ??
          PinoLevelToGoogleLoggingSeverityLookup['info'];
        return { severity, level: number };
      },
    },
  };
}

export function consoleLoggingConfig(): Options {
  return {
    messageKey: 'msg',
    transport: {
      target: 'pino-pretty',
      options: {
        singleLine: true,
        ignore:
          'req.id,req.headers,req.remoteAddress,req.remotePort,res.headers',
      },
    },
  };
}

function useLoggerFactory(configService: ConfigService<AllConfigType>): Params {
  const logLevel = configService.get('app.logLevel', { infer: true });
  const logService = (configService.get('app.logService', { infer: true }) ??
    LogService.Console) as LogService;
  const isDebug = configService.get('app.debug', { infer: true });

  const pinoHttpOptions: Options = {
    level: logLevel,
    genReqId,
    serializers: isDebug
      ? {
          req: (
            req: PinoRequest & { raw: IncomingMessage & { body?: unknown } },
          ) => {
            return { ...req, body: req.raw.body };
          },
        }
      : undefined,
    customSuccessMessage,
    customReceivedMessage,
    customErrorMessage,
    redact: {
      paths: loggingRedactPaths,
      censor: '**GDPR COMPLIANT**',
    },
    ...logServiceConfig(logService),
  };

  return {
    pinoHttp: pinoHttpOptions,
  };
}

export default useLoggerFactory;
