import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { PinoLogger } from 'nestjs-pino';
import { register } from 'prom-client';

import { Queue as QueueName } from '@/constants/job.constant';
import { BULLMQ_QUEUE_JOBS } from './metrics.constant';
import { QueueMetricsCollector } from './queue-metrics.collector';

describe('QueueMetricsCollector', () => {
  const warn = jest.fn();
  const logger = { warn } as unknown as PinoLogger;
  let queues: Record<string, { name: string; getJobCounts: jest.Mock }>;

  const createCollector = () => {
    const moduleRef = {
      get: jest.fn((token: string) => {
        const queue = queues[token];
        if (!queue) throw new Error(`Nest could not find ${token}`);
        return queue;
      }),
    } as unknown as ModuleRef;
    const collector = new QueueMetricsCollector(moduleRef, logger);
    collector.onModuleInit();
    return collector;
  };

  const scrape = async () =>
    (await register.getSingleMetric(BULLMQ_QUEUE_JOBS)!.get()).values;

  beforeEach(() => {
    jest.clearAllMocks();
    queues = {};
  });

  afterEach(() => register.removeSingleMetric(BULLMQ_QUEUE_JOBS));

  it('reports job counts per queue and state on scrape', async () => {
    queues[getQueueToken(QueueName.Email)] = {
      name: QueueName.Email,
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 3, failed: 1 }),
    };
    createCollector();

    expect(await scrape()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          labels: { queue: 'email', state: 'waiting' },
          value: 3,
        }),
        expect.objectContaining({
          labels: { queue: 'email', state: 'failed' },
          value: 1,
        }),
      ]),
    );
  });

  it('skips queues that are not registered (e.g. notifications disabled)', async () => {
    queues[getQueueToken(QueueName.Email)] = {
      name: QueueName.Email,
      getJobCounts: jest.fn().mockResolvedValue({ waiting: 0 }),
    };
    createCollector();

    const values = await scrape();
    expect(values).toHaveLength(1);
    expect(values[0].labels.queue).toBe('email');
  });

  it('logs and drops a queue whose counts cannot be read, keeping the others', async () => {
    const getJobCounts = jest.fn().mockResolvedValueOnce({ waiting: 5 });
    queues[getQueueToken(QueueName.Email)] = {
      name: QueueName.Email,
      getJobCounts,
    };
    queues[getQueueToken(QueueName.Notification)] = {
      name: QueueName.Notification,
      getJobCounts: jest.fn().mockResolvedValue({ active: 2 }),
    };
    createCollector();
    await scrape();

    getJobCounts.mockRejectedValueOnce(new Error('Redis down'));
    const values = await scrape();

    expect(values).toEqual([
      expect.objectContaining({
        labels: { queue: 'notification', state: 'active' },
        value: 2,
      }),
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ queue: 'email' }),
      'Failed to collect BullMQ job counts',
    );
  });

  it('gives up on a queue that does not answer in time instead of stalling the scrape', async () => {
    jest.useFakeTimers();
    queues[getQueueToken(QueueName.Email)] = {
      name: QueueName.Email,
      getJobCounts: jest.fn(() => new Promise(() => {})),
    };
    createCollector();

    const pending = scrape();
    await jest.advanceTimersByTimeAsync(3000);

    expect(await pending).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ queue: 'email' }),
      'Failed to collect BullMQ job counts',
    );
    jest.useRealTimers();
  });
});
