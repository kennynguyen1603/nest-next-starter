import { RedisOptions } from 'ioredis';

export type RedisConfig = {
  host?: string;
  port: number;
  password?: string;
  tls: RedisOptions['tls'];
};
