# Utils

Thư mục `src/utils/` chứa các helper, interceptor, type và pagination dùng chung toàn bộ ứng dụng.

---

## Mục lục

1. [Entity Helpers](#1-entity-helpers)
2. [Pagination](#2-pagination)
3. [Types](#3-types)
4. [Transformers](#4-transformers)
5. [Validation](#5-validation)
6. [Interceptors](#6-interceptors)

---

## 1. Entity Helpers

### `EntityRelationalHelper` — `relational-entity-helper.ts`

Base class cho tất cả **TypeORM entity**. Cung cấp hai tính năng:

- `__entity` – tự động gán tên class sau khi load từ DB (dùng để phân biệt entity ở runtime).
- `toJSON()` – serialize entity qua `instanceToPlain` của `class-transformer` (tôn trọng `@Exclude`, `@Expose`).

**Cách dùng:**

```typescript
@Entity({ name: 'role' })
export class RoleEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: String })
  id!: RoleEnum;
}
```

---

### `EntityDocumentHelper` — `document-entity-helper.ts`

Base class cho tất cả **Mongoose schema document**. Giải quyết vấn đề serialize `_id` của MongoDB khi dùng `class-transformer`.

- `_id` được transform sang `string` khi serializing (workaround cho [class-transformer#879](https://github.com/typestack/class-transformer/issues/879)).

**Cách dùng:**

```typescript
@Schema({ timestamps: true })
export class RoleSchema extends EntityDocumentHelper {
  @Prop()
  name?: string;
}
```

---

## 2. Pagination

### Infinity Pagination (phân trang đơn giản theo trang/limit)

**Khi dùng:** API trả về danh sách đơn giản với cờ `hasNextPage`, không cần đếm tổng số bản ghi.

#### `InfinityPaginationResponseDto` — `dto/infinity-pagination-response.dto.ts`

DTO response chứa `data[]` và `hasNextPage`.

Dùng `InfinityPaginationResponse(ClassRef)` để tạo Swagger-aware subclass:

```typescript
@ApiExtraModels(InfinityPaginationResponse(UserDto))
@Get()
async list(): Promise<InfinityPaginationResponse(UserDto)> { ... }
```

#### `infinityPagination()` — `infinity-pagination.ts`

Helper tính `hasNextPage` từ kết quả query:

```typescript
// Lấy limit+1 bản ghi, nếu đủ limit+1 thì còn trang sau
const data = await repo.find({ take: limit + 1 });
return infinityPagination(data.slice(0, limit), { page, limit });
```

`hasNextPage = data.length === limit` (phải truyền vào `data` đã slice đúng `limit`).

---

### Offset Pagination — `pagination/offset-pagination.ts`

**Khi dùng:** Phân trang truyền thống (page/limit) với TypeORM `SelectQueryBuilder`. Trả về cả danh sách và metadata (`OffsetPaginationDto`).

```typescript
import { paginate } from '@/utils/pagination/offset-pagination';

const [items, meta] = await paginate(qb, pageOptionsDto);
// meta.page, meta.limit, meta.itemCount, meta.pageCount
```

**Options:**

| Option | Mô tả |
|---|---|
| `skipCount` | Bỏ qua `getCount()` khi không cần tổng số (tối ưu hiệu năng) |
| `takeAll` | Bỏ qua `skip/take`, lấy toàn bộ kết quả |

```typescript
// Không đếm tổng (nhanh hơn):
const [items] = await paginate(qb, pageOptionsDto, { skipCount: true });
```

---

### Cursor Pagination — `pagination/cursor-pagination.ts`

**Khi dùng:** Phân trang hiệu quả cho dataset lớn, không cần đếm tổng số, hỗ trợ scroll vô hạn theo cursor (base64-encoded).

#### Cấu hình

```typescript
const paginator = buildPaginator({
  entity: UserEntity,
  alias: 'user',              // alias trong QueryBuilder (mặc định: tên entity lowercase)
  paginationKeys: ['createdAt', 'id'],  // các cột dùng làm cursor (mặc định: ['id'])
  query: {
    limit: 20,
    order: 'DESC',            // 'ASC' | 'DESC'
    afterCursor: req.query.afterCursor,   // cursor trang tiếp theo
    beforeCursor: req.query.beforeCursor, // cursor trang trước
  },
});

const { data, cursor } = await paginator.paginate(qb);
// cursor.afterCursor  → truyền vào request tiếp theo để lấy trang sau
// cursor.beforeCursor → truyền vào request tiếp theo để lấy trang trước
```

#### Lưu ý quan trọng

- `paginationKeys` phải bao gồm một trường **unique** (thường là `id`) ở cuối để đảm bảo thứ tự ổn định.
- Cursor được encode base64, không nên tự parse — chỉ truyền lại từ response về request.
- Hỗ trợ các kiểu: `string`, `number`, `date`, branded types (UUID...).
- Khi dùng `beforeCursor`, thứ tự kết quả sẽ tự động đảo và reverse lại về đúng chiều.

---

## 3. Types

Các type utility nhỏ, dùng thay cho `any` hoặc union phổ biến:

| File | Type | Mô tả |
|---|---|---|
| `types/maybe.type.ts` | `MaybeType<T>` | `T \| undefined` — giá trị có thể không tồn tại |
| `types/nullable.type.ts` | `NullableType<T>` | `T \| null` — giá trị có thể null |
| `types/or-never.type.ts` | `OrNeverType<T>` | `T` — alias tường minh, dùng khi muốn type T hoặc không bao giờ xảy ra |
| `types/deep-partial.type.ts` | `DeepPartial<T>` | Tất cả property (kể cả nested) đều optional |
| `types/pagination-options.ts` | `IPaginationOptions` | Interface `{ page, limit }` cho infinity pagination |

**Ví dụ:**

```typescript
function findUser(id: string): NullableType<User> { ... }
function getEmail(): MaybeType<string> { ... }

function updateUser(data: DeepPartial<User>): void { ... }
// data.address?.city là hợp lệ dù address là optional
```

---

## 4. Transformers

### `lowerCaseTransformer` — `transformers/lower-case.transformer.ts`

Dùng với decorator `@Transform` của `class-transformer` để tự động lowercase + trim chuỗi khi binding DTO.

**Cách dùng:**

```typescript
import { Transform } from 'class-transformer';
import { lowerCaseTransformer } from '@/utils/transformers/lower-case.transformer';

export class CreateUserDto {
  @Transform(lowerCaseTransformer)
  email!: string;
}
```

Nếu `value` không phải string, transformer trả về nguyên giá trị gốc (không ném lỗi).

---

## 5. Validation

### `validateConfig()` — `validate-config.ts`

**Khi dùng:** Validate biến môi trường trong `*.config.ts` khi app khởi động. Ném lỗi rõ ràng nếu thiếu hoặc sai kiểu biến môi trường — thay vì để app crash ở runtime.

```typescript
// src/config/database.config.ts
import validateConfig from '@/utils/validate-config';

class DatabaseVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsInt()
  @Min(1)
  DATABASE_PORT!: number;
}

export default registerAs('database', () =>
  validateConfig(process.env, DatabaseVariables),
);
```

Khi có lỗi, sẽ throw với message rõ từng property:

```
Error in DATABASE_PORT:
+ isInt: DATABASE_PORT must be an integer
```

---

### `validationOptions` — `validation-options.ts`

Cấu hình mặc định cho `ValidationPipe` toàn app:

| Option | Giá trị | Ý nghĩa |
|---|---|---|
| `transform` | `true` | Tự động transform type (string → number, v.v.) |
| `whitelist` | `true` | Loại bỏ các field không có trong DTO |
| `errorHttpStatusCode` | `422` | Lỗi validation trả về `422 Unprocessable Entity` |

**Cấu hình trong `main.ts`:**

```typescript
import validationOptions from '@/utils/validation-options';

app.useGlobalPipes(new ValidationPipe(validationOptions));
```

Lỗi validation trả về format:

```json
{
  "status": 422,
  "errors": {
    "email": "email must be an email",
    "password": "password must be longer than 6 characters"
  }
}
```

---

## 6. Interceptors

### `ResolvePromisesInterceptor` — `serializer.interceptor.ts`

**Khi dùng:** Khi response chứa các nested object có getter/virtual field trả về `Promise`. Interceptor tự động resolve tất cả Promise trong object response trước khi gửi về client.

**Cấu hình globally:**

```typescript
// main.ts
import { ResolvePromisesInterceptor } from '@/utils/serializer.interceptor';

app.useGlobalInterceptors(new ResolvePromisesInterceptor());
```

**Hoặc trên controller/route:**

```typescript
@UseInterceptors(ResolvePromisesInterceptor)
@Get(':id')
async findOne(@Param('id') id: string) { ... }
```

Interceptor này dùng `deepResolvePromises()` (`deep-resolver.ts`) để traverse toàn bộ cây object và resolve từng Promise tìm thấy.
