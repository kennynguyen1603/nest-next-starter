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
    const forwarded =
      req.headers['x-forwarded-for'] ?? req.headers['x-real-ip'];
    if (forwarded) {
      const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return Promise.resolve(ip.trim());
    }
    return Promise.resolve(req.ips?.[0] ?? req.ip);
  }
}
