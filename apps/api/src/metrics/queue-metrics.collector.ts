import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Gauge } from 'prom-client';

import { Queue as QueueName } from '@/constants/job.constant';
import { BULLMQ_QUEUE_JOBS } from './metrics.constant';

// Queue connections retry for a long time while Redis is down; without a cap a
// single stuck queue would time out the whole scrape (CPU, memory included).
const COLLECT_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Job counts live in Redis, so they are read on each scrape (via `collect`)
// instead of being tracked in-process.
@Injectable()
export class QueueMetricsCollector implements OnModuleInit {
  private queues: Queue[] = [];

  private readonly gauge = new Gauge({
    name: BULLMQ_QUEUE_JOBS,
    help: 'Number of BullMQ jobs per queue and state',
    labelNames: ['queue', 'state'],
    collect: () => this.collect(),
  });

  constructor(
    private readonly moduleRef: ModuleRef,
    @InjectPinoLogger(QueueMetricsCollector.name)
    private readonly logger: PinoLogger,
  ) {}

  onModuleInit(): void {
    this.queues = Object.values(QueueName).flatMap((name) => {
      try {
        return [
          this.moduleRef.get<Queue>(getQueueToken(name), { strict: false }),
        ];
      } catch {
        // Queue module not loaded, e.g. notifications are disabled.
        return [];
      }
    });
  }

  private async collect(): Promise<void> {
    // Drop last scrape's series so a queue that fails now reports nothing
    // rather than stale counts.
    this.gauge.reset();
    await Promise.all(
      this.queues.map(async (queue) => {
        try {
          const counts = await withTimeout(
            queue.getJobCounts(),
            COLLECT_TIMEOUT_MS,
          );
          for (const [state, count] of Object.entries(counts)) {
            this.gauge.set({ queue: queue.name, state }, count);
          }
        } catch (err: unknown) {
          this.logger.warn(
            { err, queue: queue.name },
            'Failed to collect BullMQ job counts',
          );
        }
      }),
    );
  }
}
