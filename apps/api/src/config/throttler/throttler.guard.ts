import { ContextType, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import { FastifyReply, FastifyRequest } from 'fastify';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext) {
    const type: ContextType & 'graphql' = context.getType();
    if (type === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext<{
        req: FastifyRequest;
        res: FastifyReply;
      }>();
      return { req: ctx.req, res: ctx.res };
    }
    return super.getRequestResponse(context);
  }

  protected getTracker(req: FastifyRequest): Promise<string> {
    // Use the framework-derived client IP, which honours the configured
    // `trust proxy` setting (see main.ts). Never read X-Forwarded-* directly:
    // a client can spoof those headers to rotate its rate-limit key and bypass
    // the limiter. Behind a proxy, set TRUST_PROXY so req.ip resolves correctly.
    return Promise.resolve(req.ips?.[0] ?? req.ip ?? 'unknown');
  }
}
