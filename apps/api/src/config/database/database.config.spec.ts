import databaseConfig from './database.config';

describe('database config', () => {
  const original = process.env;

  beforeEach(() => {
    process.env = {
      ...original,
      DATABASE_URL: 'mongodb://localhost/test',
      DATABASE_TYPE: 'mongodb',
    };
    delete process.env.DATABASE_MAX_CONNECTIONS;
    delete process.env.DATABASE_MIN_CONNECTIONS;
    delete process.env.DATABASE_IDLE_TIMEOUT_MS;
    delete process.env.DATABASE_CONNECTION_TIMEOUT_MS;
  });

  afterEach(() => {
    process.env = original;
  });

  it('uses a small per-process pool by default', () => {
    expect(databaseConfig()).toMatchObject({
      maxConnections: 10,
      minConnections: 0,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 10000,
    });
  });

  it('reads pool settings from env', () => {
    process.env.DATABASE_MAX_CONNECTIONS = '25';
    process.env.DATABASE_MIN_CONNECTIONS = '5';
    process.env.DATABASE_IDLE_TIMEOUT_MS = '60000';
    process.env.DATABASE_CONNECTION_TIMEOUT_MS = '2000';

    expect(databaseConfig()).toMatchObject({
      maxConnections: 25,
      minConnections: 5,
      idleTimeoutMs: 60000,
      connectionTimeoutMs: 2000,
    });
  });

  it('rejects a zero max pool size', () => {
    process.env.DATABASE_MAX_CONNECTIONS = '0';

    expect(() => databaseConfig()).toThrow();
  });
});
