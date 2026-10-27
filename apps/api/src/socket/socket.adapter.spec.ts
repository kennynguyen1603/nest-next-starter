import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { RedisConfig } from '@/config/redis/redis-config.type';
import { RedisIoAdapter } from './socket.adapter';

function createClient() {
  return {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
    duplicate: jest.fn(),
  };
}

const subClient = createClient();
const pubClient = { ...createClient(), duplicate: jest.fn(() => subClient) };

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => pubClient),
}));

const adapterConstructor = jest.fn();
jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn(() => adapterConstructor),
}));

describe('RedisIoAdapter', () => {
  const config: RedisConfig = {
    host: 'redis',
    port: 6379,
    password: 'secret',
    tls: undefined,
  };
  let adapter: RedisIoAdapter;
  let server: { adapter: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    server = { adapter: jest.fn() };
    jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue(server as never);
    jest.spyOn(IoAdapter.prototype, 'dispose').mockResolvedValue(undefined);
    adapter = new RedisIoAdapter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('connects a pub/sub pair before building the adapter', async () => {
    await adapter.connectToRedis(config);

    expect(Redis).toHaveBeenCalledWith({
      host: 'redis',
      port: 6379,
      password: 'secret',
      tls: undefined,
      lazyConnect: true,
    });
    expect(pubClient.connect).toHaveBeenCalled();
    expect(subClient.connect).toHaveBeenCalled();
    expect(pubClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(subClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(createAdapter).toHaveBeenCalledWith(pubClient, subClient);
  });

  it('does not build the adapter when Redis is unreachable', async () => {
    pubClient.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    await expect(adapter.connectToRedis(config)).rejects.toThrow(
      'ECONNREFUSED',
    );
    expect(createAdapter).not.toHaveBeenCalled();
  });

  it('attaches the Redis adapter to the created server', async () => {
    await adapter.connectToRedis(config);

    expect(adapter.createIOServer(0)).toBe(server);
    expect(server.adapter).toHaveBeenCalledWith(adapterConstructor);
  });

  it('keeps the in-memory adapter when not connected', () => {
    adapter.createIOServer(0);

    expect(server.adapter).not.toHaveBeenCalled();
  });

  it('closes both Redis clients on dispose', async () => {
    await adapter.connectToRedis(config);
    await adapter.dispose();

    expect(pubClient.quit).toHaveBeenCalledTimes(1);
    expect(subClient.quit).toHaveBeenCalledTimes(1);

    await adapter.dispose();
    expect(pubClient.quit).toHaveBeenCalledTimes(1);
  });
});
