import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { NextFunction, Request, Response } from 'express';
import { Histogram } from 'prom-client';

import { HTTP_REQUEST_DURATION } from './metrics.constant';

// Label by the matched route pattern (`/api/v1/users/:id`), never the raw URL,
// so ids and probes for unknown paths cannot blow up label cardinality.
// Mounted with a path-less `app.use`, so `req.route` is only set once a
// handler matched.
function routeOf(req: Request): string {
  const route = req.route as { path: string } | undefined;
  return route ? `${req.baseUrl}${route.path}` : 'unmatched';
}

@Injectable()
export class HttpMetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION)
    private readonly histogram: Histogram<'method' | 'route' | 'status_code'>,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const stopTimer = this.histogram.startTimer();
    res.on('finish', () => {
      stopTimer({
        method: req.method,
        route: routeOf(req),
        status_code: res.statusCode,
      });
    });
    next();
  }
}
