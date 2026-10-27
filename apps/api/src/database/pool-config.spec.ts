import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import { MongooseConfigService } from './mongoose-config.service';
import { TypeOrmConfigService } from './typeorm-config.service';

describe('database pool config', () => {
  const pool = {
    'database.maxConnections': 20,
    'database.minConnections': 2,
    'database.idleTimeoutMs': 15000,
    'database.connectionTimeoutMs': 5000,
  };

  function createConfig(values: Record<string, unknown>) {
    return {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService<AllConfigType>;
  }

  it('maps pool settings onto the node-postgres pool', () => {
    const service = new TypeOrmConfigService(
      createConfig({ ...pool, 'database.type': 'postgres' }),
    );

    expect(service.createTypeOrmOptions()).toMatchObject({
      extra: {
        max: 20,
        min: 2,
        idleTimeoutMillis: 15000,
        connectionTimeoutMillis: 5000,
      },
    });
  });

  it('maps pool settings onto the MongoDB driver pool', () => {
    const service = new MongooseConfigService(
      createConfig({ ...pool, 'database.url': 'mongodb://localhost/test' }),
    );

    expect(service.createMongooseOptions()).toMatchObject({
      uri: 'mongodb://localhost/test',
      maxPoolSize: 20,
      minPoolSize: 2,
      maxIdleTimeMS: 15000,
      serverSelectionTimeoutMS: 5000,
    });
  });
});
