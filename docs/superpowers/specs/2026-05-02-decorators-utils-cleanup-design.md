# Design: Dọn dẹp trùng lặp giữa decorators/ và utils/

**Date:** 2026-05-02  
**Scope:** `apps/api/src/decorators/`, `apps/api/src/utils/`

---

## Vấn đề

Sau khi cấu hình `src/decorators`, phát hiện 2 vấn đề:

1. **Broken import**: `src/decorators/http.decorators.ts` import `Serialize` từ `@/utils/interceptors/serialize` nhưng file này không tồn tại — gây lỗi biên dịch tiềm ẩn.

2. **Trùng chức năng**: `src/utils/transformers/lower-case.transformer.ts` (`lowerCaseTransformer`) và `src/decorators/transform.decorators.ts` (`ToLowerCase()`) đều làm cùng một việc: lowercase + trim một string field khi deserialize DTO.

---

## Quyết định thiết kế

### Nguyên tắc phân chia

- **`src/decorators/`** — chứa các hàm trả về decorator (`@` syntax), bao gồm field decorators, transform decorators, validator decorators, HTTP/Swagger decorators.
- **`src/utils/`** — chứa helper functions, base classes, interceptors, types. Không chứa decorator factory nếu đã có decorator tương đương trong `decorators/`.

### Phần 1 — Thống nhất lowercase transform

**Xóa:** `src/utils/transformers/lower-case.transformer.ts`

**Lý do:** `ToLowerCase()` trong `src/decorators/transform.decorators.ts` đã làm cùng chức năng, thêm xử lý array và option `{ toClassOnly: true }` (đúng hành vi cho input field — chỉ transform khi deserialize từ request, không transform khi serialize ra response).

**Cập nhật 6 DTOs** — thay `@Transform(lowerCaseTransformer)` bằng `@ToLowerCase()`:

| File |
|---|
| `src/auth/dto/auth-email-login.dto.ts` |
| `src/auth/dto/auth-forgot-password.dto.ts` |
| `src/auth/dto/auth-register-login.dto.ts` |
| `src/auth/dto/auth-update.dto.ts` |
| `src/users/dto/create-user.dto.ts` |
| `src/users/dto/update-user.dto.ts` |

> **Hành vi thay đổi nhỏ**: `lowerCaseTransformer` trước đây không có `toClassOnly: true`. Sau thay đổi, transform chỉ chạy khi deserialize vào class. Đây là hành vi đúng cho email/username input.

### Phần 2 — Tạo `utils/interceptors/serialize.ts`

Tạo file `src/utils/interceptors/serialize.ts` với `Serialize` interceptor factory để fix broken import trong `http.decorators.ts`.

**Implementation:**

```ts
@Injectable()
class SerializeInterceptor implements NestInterceptor {
  constructor(private readonly dto: Type<any>) {}

  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => plainToInstance(this.dto, data, { excludeExtraneousValues: true })),
    );
  }
}

export function Serialize(dto: Type<any>): MethodDecorator {
  return UseInterceptors(new SerializeInterceptor(dto));
}
```

Dùng `plainToInstance` với `excludeExtraneousValues: true` để đảm bảo response chỉ chứa các field được khai báo trong DTO class (tránh rò rỉ field nhạy cảm).

---

## Tổng kết thay đổi

| Thao tác | File |
|---|---|
| Xóa | `src/utils/transformers/lower-case.transformer.ts` |
| Tạo mới | `src/utils/interceptors/serialize.ts` |
| Cập nhật | `src/auth/dto/auth-email-login.dto.ts` |
| Cập nhật | `src/auth/dto/auth-forgot-password.dto.ts` |
| Cập nhật | `src/auth/dto/auth-register-login.dto.ts` |
| Cập nhật | `src/auth/dto/auth-update.dto.ts` |
| Cập nhật | `src/users/dto/create-user.dto.ts` |
| Cập nhật | `src/users/dto/update-user.dto.ts` |

**Không thay đổi:** `decorators/transform.decorators.ts`, `utils/types/`, `utils/pagination/`, `utils/serializer.interceptor.ts`, các file còn lại.
