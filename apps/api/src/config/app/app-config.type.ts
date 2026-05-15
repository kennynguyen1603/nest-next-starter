export type AppConfig = {
  nodeEnv: string;
  name: string;
  workingDirectory: string;
  frontendDomain?: string;
  backendDomain: string;
  port: number;
  apiPrefix: string;
  appPrefix: string;
  corsOrigin?: string;
  fallbackLanguage: string;
  headerLanguage: string;
  appLogging: boolean;
  debug: boolean;
  logLevel: string;
  logService: string;
};
