import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Expose } from 'class-transformer';
import { lastValueFrom, of } from 'rxjs';
import { Serialize, SerializeInterceptor } from './serialize';

class UserResponseDto {
  @Expose()
  name: string;
}

describe('SerializeInterceptor', () => {
  const mockContext = {} as ExecutionContext;

  it('strips fields not declared with @Expose()', async () => {
    const interceptor = new SerializeInterceptor(UserResponseDto);
    const mockNext: CallHandler = {
      handle: () => of({ name: 'Alice', secret: 'hidden' }),
    };

    const result: any = await lastValueFrom(
      interceptor.intercept(mockContext, mockNext),
    );

    expect(result).toEqual({ name: 'Alice' });
    expect(result.secret).toBeUndefined();
  });

  it('returns empty object when DTO has no @Expose() fields', async () => {
    class EmptyDto {}
    const interceptor = new SerializeInterceptor(EmptyDto);
    const mockNext: CallHandler = { handle: () => of({ name: 'Alice' }) };

    const result = await lastValueFrom(
      interceptor.intercept(mockContext, mockNext),
    );

    expect(result).toEqual({});
  });

  it('passes null through without transformation', async () => {
    const interceptor = new SerializeInterceptor(UserResponseDto);
    const mockNext: CallHandler = { handle: () => of(null) };

    const result = await lastValueFrom(
      interceptor.intercept(mockContext, mockNext),
    );

    expect(result).toBeNull();
  });
});

describe('Serialize factory', () => {
  it('returns a MethodDecorator', () => {
    const decorator = Serialize(UserResponseDto);
    expect(typeof decorator).toBe('function');
  });
});
