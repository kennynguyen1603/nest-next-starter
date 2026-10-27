import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Request): Promise<string> {
    // Use the framework-derived client IP, which honours the configured
    // `trust proxy` setting (see main.ts). Never read X-Forwarded-* directly:
    // a client can spoof those headers to rotate its rate-limit key and bypass
    // the limiter. Behind a proxy, set TRUST_PROXY so req.ip resolves correctly.
    return Promise.resolve(req.ips?.[0] ?? req.ip ?? 'unknown');
  }
}
