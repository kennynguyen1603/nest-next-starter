# Decorators/Utils Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Loại bỏ trùng lặp chức năng giữa `src/decorators` và `src/utils`, đồng thời fix broken import `@/utils/interceptors/serialize`.

**Architecture:** Xóa `lowerCaseTransformer` (raw transformer function) và thay bằng `@ToLowerCase()` decorator đã có sẵn. Tạo file `serialize.ts` chứa `SerializeInterceptor` + factory function `Serialize()` để fix import bị gãy trong `http.decorators.ts`.

**Tech Stack:** NestJS, class-transformer (`plainToInstance`), class-validator, Jest, TypeScript.

---

## File Map

| Thao tác | Path |
|---|---|
| **Tạo mới** | `src/utils/interceptors/serialize.ts` |
| **Tạo mới (test)** | `src/utils/interceptors/serialize.spec.ts` |
| **Xóa** | `src/utils/transformers/lower-case.transformer.ts` |
| **Sửa** | `src/auth/dto/auth-email-login.dto.ts` |
| **Sửa** | `src/auth/dto/auth-forgot-password.dto.ts` |
| **Sửa** | `src/auth/dto/auth-register-login.dto.ts` |
| **Sửa** | `src/auth/dto/auth-update.dto.ts` |
| **Sửa** | `src/users/dto/create-user.dto.ts` |
| **Sửa** | `src/users/dto/update-user.dto.ts` |

---

## Task 1: Tạo `SerializeInterceptor` và `Serialize()` factory

**Files:**
- Create: `apps/api/src/utils/interceptors/serialize.spec.ts`
- Create: `apps/api/src/utils/interceptors/serialize.ts`

---

- [ ] **Step 1.1: Viết test thất bại**

Tạo file `apps/api/src/utils/interceptors/serialize.spec.ts`:

```ts
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { plainToInstance } from 'class-transformer';
import { Expose } from 'class-transformer';
import { Serialize } from './serialize';

class UserResponseDto {
  @Expose()
  name: string;
}

describe('Serialize', () => {
  it('strips fields not declared in the DTO', (done) => {
    const decorator = Serialize(UserResponseDto);

    // minimal mock context — not used by the interceptor
    const mockContext = {} as ExecutionContext;
    const mockNext: CallHandler = {
      handle: () => of({ name: 'Alice', secret: 'hidden' }),
    };

    // extract the interceptor instance from UseInterceptors metadata
    const interceptors: any[] = Reflect.getMetadata(
      '__interceptors__',
      decorator,
    ) ?? [];

    // fallback: instantiate directly for unit testing
    const { SerializeInterceptor } = require('./serialize');
    const interceptor = new SerializeInterceptor(UserResponseDto);

    interceptor.intercept(mockContext, mockNext).subscribe((result: any) => {
      expect(result).toEqual({ name: 'Alice' });
      expect(result.secret).toBeUndefined();
      done();
    });
  });

  it('returns empty object when no @Expose fields match', (done) => {
    class EmptyDto {}
    const { SerializeInterceptor } = require('./serialize');
    const interceptor = new SerializeInterceptor(EmptyDto);
    const mockContext = {} as ExecutionContext;
    const mockNext: CallHandler = { handle: () => of({ name: 'Alice' }) };

    interceptor.intercept(mockContext, mockNext).subscribe((result: any) => {
      expect(result).toEqual({});
      done();
    });
  });
});
```

- [ ] **Step 1.2: Chạy test để xác nhận thất bại**

```bash
cd apps/api && pnpm test src/utils/interceptors/serialize.spec.ts
```

Expected: `Cannot find module './serialize'`

- [ ] **Step 1.3: Implement `serialize.ts`**

Tạo file `apps/api/src/utils/interceptors/serialize.ts`:

```ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Type,
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
          plainToInstance(this.dto, data, { excludeExtraneousValues: true }),
        ),
      );
  }
}

export function Serialize(dto: Type<any>): MethodDecorator {
  return UseInterceptors(new SerializeInterceptor(dto));
}
```

- [ ] **Step 1.4: Chạy test để xác nhận pass**

```bash
cd apps/api && pnpm test src/utils/interceptors/serialize.spec.ts
```

Expected: `PASS` — 2 tests passed.

- [ ] **Step 1.5: Verify build không có lỗi**

```bash
cd apps/api && pnpm build
```

Expected: build thành công, không còn lỗi `Cannot find module '@/utils/interceptors/serialize'`.

- [ ] **Step 1.6: Commit**

```bash
git add apps/api/src/utils/interceptors/serialize.ts \
        apps/api/src/utils/interceptors/serialize.spec.ts
git commit -m "feat(utils): add SerializeInterceptor and Serialize factory"
```

---

## Task 2: Thay `lowerCaseTransformer` bằng `@ToLowerCase()` trong 6 DTOs

**Files:**
- Delete: `apps/api/src/utils/transformers/lower-case.transformer.ts`
- Modify: `apps/api/src/auth/dto/auth-email-login.dto.ts`
- Modify: `apps/api/src/auth/dto/auth-forgot-password.dto.ts`
- Modify: `apps/api/src/auth/dto/auth-register-login.dto.ts`
- Modify: `apps/api/src/auth/dto/auth-update.dto.ts`
- Modify: `apps/api/src/users/dto/create-user.dto.ts`
- Modify: `apps/api/src/users/dto/update-user.dto.ts`
- Create (test): `apps/api/src/auth/dto/auth-email-login.dto.spec.ts`

---

- [ ] **Step 2.1: Viết test thất bại cho DTO transform**

Tạo file `apps/api/src/auth/dto/auth-email-login.dto.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { AuthEmailLoginDto } from './auth-email-login.dto';

describe('AuthEmailLoginDto — email transform', () => {
  it('lowercases email on deserialization', () => {
    const dto = plainToInstance(AuthEmailLoginDto, {
      email: 'USER@EXAMPLE.COM',
      password: 'secret',
    });
    expect(dto.email).toBe('user@example.com');
  });

  it('trims whitespace from email', () => {
    const dto = plainToInstance(AuthEmailLoginDto, {
      email: '  User@Example.COM  ',
      password: 'secret',
    });
    expect(dto.email).toBe('user@example.com');
  });
});
```

- [ ] **Step 2.2: Chạy test để xác nhận pass với transformer hiện tại**

```bash
cd apps/api && pnpm test src/auth/dto/auth-email-login.dto.spec.ts
```

Expected: `PASS` — đây là baseline trước khi thay đổi. Nếu fail, kiểm tra lại `lowerCaseTransformer`.

- [ ] **Step 2.3: Cập nhật `auth-email-login.dto.ts`**

Thay nội dung file `apps/api/src/auth/dto/auth-email-login.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class AuthEmailLoginDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  password: string;
}
```

- [ ] **Step 2.4: Cập nhật `auth-forgot-password.dto.ts`**

Thay nội dung file `apps/api/src/auth/dto/auth-forgot-password.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class AuthForgotPasswordDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsEmail()
  email: string;
}
```

- [ ] **Step 2.5: Cập nhật `auth-register-login.dto.ts`**

Thay nội dung file `apps/api/src/auth/dto/auth-register-login.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class AuthRegisterLoginDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsEmail()
  email: string;

  @ApiProperty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  lastName: string;
}
```

- [ ] **Step 2.6: Cập nhật `auth-update.dto.ts`**

Thay nội dung file `apps/api/src/auth/dto/auth-update.dto.ts`:

```ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class AuthUpdateDto {
  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'new.email@example.com' })
  @IsOptional()
  @IsNotEmpty()
  @IsEmail()
  @ToLowerCase()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNotEmpty({ message: 'mustBeNotEmpty' })
  oldPassword?: string;
}
```

- [ ] **Step 2.7: Cập nhật `create-user.dto.ts`**

Thay nội dung file `apps/api/src/users/dto/create-user.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { RoleDto } from '../../roles/dto/role.dto';
import { StatusDto } from '../../statuses/dto/status.dto';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class CreateUserDto {
  @ApiProperty({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsNotEmpty()
  @IsEmail()
  email: string | null;

  @ApiProperty()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiProperty({ example: 'John', type: String })
  @IsNotEmpty()
  firstName: string | null;

  @ApiProperty({ example: 'Doe', type: String })
  @IsNotEmpty()
  lastName: string | null;

  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({ type: StatusDto })
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;
}
```

- [ ] **Step 2.8: Cập nhật `update-user.dto.ts`**

Thay nội dung file `apps/api/src/users/dto/update-user.dto.ts`:

```ts
import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { Type } from 'class-transformer';
import { IsEmail, IsOptional, MinLength } from 'class-validator';
import { FileDto } from '../../files/dto/file.dto';
import { RoleDto } from '../../roles/dto/role.dto';
import { StatusDto } from '../../statuses/dto/status.dto';
import { ToLowerCase } from '@/decorators/transform.decorators';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'test1@example.com', type: String })
  @ToLowerCase()
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @MinLength(6)
  password?: string;

  provider?: string;

  socialId?: string | null;

  @ApiPropertyOptional({ example: 'John', type: String })
  @IsOptional()
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe', type: String })
  @IsOptional()
  lastName?: string | null;

  @ApiPropertyOptional({ type: () => FileDto })
  @IsOptional()
  photo?: FileDto | null;

  @ApiPropertyOptional({ type: () => RoleDto })
  @IsOptional()
  @Type(() => RoleDto)
  role?: RoleDto | null;

  @ApiPropertyOptional({ type: () => StatusDto })
  @IsOptional()
  @Type(() => StatusDto)
  status?: StatusDto;
}
```

- [ ] **Step 2.9: Xóa `lower-case.transformer.ts`**

```bash
rm apps/api/src/utils/transformers/lower-case.transformer.ts
```

Kiểm tra không còn thư mục `transformers/` rỗng:

```bash
ls apps/api/src/utils/transformers/ 2>&1
```

Expected: `No such file or directory` (thư mục đã rỗng và bị xóa cùng file).

> Nếu thư mục vẫn còn và rỗng: `rmdir apps/api/src/utils/transformers/`

- [ ] **Step 2.10: Chạy lại test DTO để xác nhận hành vi không đổi**

```bash
cd apps/api && pnpm test src/auth/dto/auth-email-login.dto.spec.ts
```

Expected: `PASS` — behavior giữ nguyên (lowercase + trim vẫn hoạt động).

- [ ] **Step 2.11: Verify build không còn lỗi**

```bash
cd apps/api && pnpm build
```

Expected: build thành công, không có `Cannot find module '../../utils/transformers/lower-case.transformer'`.

- [ ] **Step 2.12: Commit**

```bash
git add \
  apps/api/src/auth/dto/auth-email-login.dto.ts \
  apps/api/src/auth/dto/auth-email-login.dto.spec.ts \
  apps/api/src/auth/dto/auth-forgot-password.dto.ts \
  apps/api/src/auth/dto/auth-register-login.dto.ts \
  apps/api/src/auth/dto/auth-update.dto.ts \
  apps/api/src/users/dto/create-user.dto.ts \
  apps/api/src/users/dto/update-user.dto.ts
git rm apps/api/src/utils/transformers/lower-case.transformer.ts
git commit -m "refactor(dto): replace lowerCaseTransformer with @ToLowerCase() decorator"
```

---

## Self-Review

**Spec coverage:**
- ✅ `lower-case.transformer.ts` bị xóa (Task 2, Step 2.9)
- ✅ 6 DTOs cập nhật sang `@ToLowerCase()` (Steps 2.3–2.8)
- ✅ `serialize.ts` được tạo với `SerializeInterceptor` + `Serialize()` (Task 1)
- ✅ `http.decorators.ts` broken import được fix (Task 1 giải quyết vì file đích đã tồn tại)

**Placeholder scan:** Không có TBD/TODO. Tất cả code blocks đầy đủ.

**Type consistency:** `SerializeInterceptor` được export trong `serialize.ts` và dùng trực tiếp trong spec — nhất quán. `ToLowerCase` import từ `@/decorators/transform.decorators` trong tất cả 6 DTOs — nhất quán.
