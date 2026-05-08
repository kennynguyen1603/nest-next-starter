import type { Type } from '@nestjs/common';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  constructor(private readonly dto: Type<unknown>) {}

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) =>
        data == null
          ? data
          : plainToInstance(this.dto, data, {
              excludeExtraneousValues: true,
            }),
      ),
    );
  }
}

export function Serialize(dto: Type<unknown>): MethodDecorator {
  return UseInterceptors(new SerializeInterceptor(dto));
}
