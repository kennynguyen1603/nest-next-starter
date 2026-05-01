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
  constructor(private readonly dto: Type<any>) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next
      .handle()
      .pipe(
        map((data) =>
          data == null
            ? data
            : plainToInstance(this.dto, data, { excludeExtraneousValues: true }),
        ),
      );
  }
}

export function Serialize(dto: Type<any>): MethodDecorator {
  return UseInterceptors(new SerializeInterceptor(dto));
}
