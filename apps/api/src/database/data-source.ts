import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import databaseConfig from '@/config/database/database.config';
import { DatabaseConfig } from '@/config/database/database-config.type';

dotenv.config();

const dbConfig = databaseConfig() as DatabaseConfig;

export const AppDataSource = new DataSource({
  type: dbConfig.type,
  url: dbConfig.url,
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.name,
  synchronize: dbConfig.synchronize,
  dropSchema: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  extra: {
    // based on https://node-postgres.com/api/pool
    // max connection pool size
    max: dbConfig.maxConnections,
    ssl: dbConfig.sslEnabled
      ? {
          rejectUnauthorized: dbConfig.rejectUnauthorized,
          ca: dbConfig.ca ?? undefined,
          key: dbConfig.key ?? undefined,
          cert: dbConfig.cert ?? undefined,
        }
      : undefined,
  },
} as DataSourceOptions);
