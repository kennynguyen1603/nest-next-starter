import { Module } from '@nestjs/common';
import { makeHistogramProvider } from '@willsoto/nestjs-prometheus';

import { HttpMetricsMiddleware } from './http-metrics.middleware';
import { HTTP_REQUEST_DURATION } from './metrics.constant';
import { QueueMetricsCollector } from './queue-metrics.collector';

// CPU/memory/event-loop come from the default metrics enabled by
// PrometheusModule.register(); this module adds HTTP latency and BullMQ state.
// HttpMetricsMiddleware is mounted globally in main.ts: `forRoutes('{*path}')`
// combined with `setGlobalPrefix(..., { exclude: ['/'] })` makes Nest mount it
// on `/` only, so it would never see `/api/...` requests.
@Module({
  providers: [
    makeHistogramProvider({
      name: HTTP_REQUEST_DURATION,
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'route', 'status_code'],
    }),
    HttpMetricsMiddleware,
    QueueMetricsCollector,
  ],
})
export class MetricsModule {}
