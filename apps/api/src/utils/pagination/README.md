# Pagination

Three pagination strategies are pre-configured. Choose the right one for each use case.

---

## Quick Reference

| Strategy | When to use | Total count? | Logic file |
|---|---|---|---|
| **Infinity** | Infinite scroll, simple lists | ❌ | `infinity-pagination.ts` |
| **Offset** | Data tables with page numbers | ✅ | `offset-pagination.ts` |
| **Cursor** | Large datasets, real-time feeds | ❌ | `cursor-pagination.ts` |

---

## 1. Infinity Pagination

Returns `{ data, hasNextPage }`. No total record count. Best for mobile and infinite scroll.

**DTOs:** `src/common/dto/infinity-pagination/paginated.dto.ts`

### Controller

```ts
import {
  InfinityPaginationResponse,
  InfinityPaginationResponseDto,
} from '@/common/dto/infinity-pagination/paginated.dto';
import { infinityPagination } from '@/utils/pagination/infinity-pagination';

@ApiOkResponse({ type: InfinityPaginationResponse(UserDto) })
@Get()
async findAll(@Query() query: QueryDto): Promise<InfinityPaginationResponseDto<UserDto>> {
  const page = query.page ?? 1;
  const limit = Math.min(query.limit ?? 10, 50);

  const data = await this.service.findManyWithPagination({
    paginationOptions: { page, limit },
  });

  return infinityPagination(data, { page, limit });
}
```

### Service / Repository

The repository must fetch `limit + 1` records so `infinityPagination` can compute `hasNextPage`:

```ts
// repository
async findManyWithPagination({ paginationOptions }: {
  paginationOptions: IPaginationOptions;
}): Promise<User[]> {
  return this.repo.find({
    skip: (paginationOptions.page - 1) * paginationOptions.limit,
    take: paginationOptions.limit + 1,  // +1 to detect hasNextPage
  });
}

// service — slice off the extra record before returning
async findManyWithPagination(options): Promise<User[]> {
  const data = await this.repo.findManyWithPagination(options);
  return data.slice(0, options.paginationOptions.limit);
}
```

### Response shape

```json
{
  "data": [...],
  "hasNextPage": true
}
```

---

## 2. Offset Pagination

Returns `{ data, pagination }` with full metadata (totalPages, currentPage, etc.). Best for admin data tables where jumping to a specific page is needed.

**DTOs:** `src/common/dto/offset-pagination/`

| File | Purpose |
|---|---|
| `page-options.dto.ts` | Query params (page, limit, order, q) |
| `offset-pagination.dto.ts` | Pagination metadata |
| `paginated.dto.ts` | `OffsetPaginatedDto<T>` response wrapper |

### Controller

```ts
import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { paginate } from '@/utils/pagination/offset-pagination';
import { ApiAuth } from '@/decorators/http.decorators';

@ApiAuth({ type: UserDto, isPaginated: true })
@Get()
async findAll(@Query() pageOptions: PageOptionsDto): Promise<OffsetPaginatedDto<UserDto>> {
  const qb = this.repo.createQueryBuilder('user');

  if (pageOptions.q) {
    qb.andWhere('user.email ILIKE :q', { q: `%${pageOptions.q}%` });
  }

  const [data, meta] = await paginate(qb, pageOptions);
  return new OffsetPaginatedDto(data, meta);
}
```

### Query params

| Param | Default | Description |
|---|---|---|
| `page` | `1` | Current page number |
| `limit` | `DEFAULT_PAGE_LIMIT` | Records per page |
| `order` | `asc` | Sort direction |
| `q` | — | Free-text search |

### `paginate()` options

```ts
// Skip getCount() when total record count is not needed (faster)
const [data] = await paginate(qb, pageOptions, { skipCount: true });

// Ignore skip/take and return all results
const [data] = await paginate(qb, pageOptions, { takeAll: true });
```

### Response shape

```json
{
  "data": [...],
  "pagination": {
    "currentPage": 2,
    "limit": 10,
    "totalRecords": 47,
    "totalPages": 5,
    "nextPage": 3,
    "previousPage": 1
  }
}
```

---

## 3. Cursor Pagination

Uses a base64-encoded cursor instead of page numbers. Efficient for large datasets with no total count needed. Supports bidirectional scrolling (next + previous).

**DTOs:** `src/common/dto/cursor-pagination/`

| File | Purpose |
|---|---|
| `page-options.dto.ts` | Query params (afterCursor, beforeCursor, limit, q) |
| `cursor-pagination.dto.ts` | Pagination metadata (cursors, totalRecords) |
| `paginated.dto.ts` | `CursorPaginatedDto<T>` response wrapper |

### Controller

```ts
import { PageOptionsDto } from '@/common/dto/cursor-pagination/page-options.dto';
import { CursorPaginatedDto } from '@/common/dto/cursor-pagination/paginated.dto';
import { CursorPaginationDto } from '@/common/dto/cursor-pagination/cursor-pagination.dto';
import { buildPaginator } from '@/utils/pagination/cursor-pagination';
import { ApiAuth } from '@/decorators/http.decorators';

@ApiAuth({ type: UserDto, isPaginated: true, paginationType: 'cursor' })
@Get()
async findAll(@Query() pageOptions: PageOptionsDto): Promise<CursorPaginatedDto<UserDto>> {
  const qb = this.repo.createQueryBuilder('user');

  const paginator = buildPaginator({
    entity: UserEntity,
    alias: 'user',
    paginationKeys: ['createdAt', 'id'],  // must end with a unique column
    query: {
      limit: pageOptions.limit,
      order: 'DESC',
      afterCursor: pageOptions.afterCursor,
      beforeCursor: pageOptions.beforeCursor,
    },
  });

  const { data, cursor } = await paginator.paginate(qb);

  const meta = new CursorPaginationDto(
    data.length,
    cursor.afterCursor ?? '',
    cursor.beforeCursor ?? '',
    pageOptions,
  );

  return new CursorPaginatedDto(data, meta);
}
```

### Query params

| Param | Description |
|---|---|
| `limit` | Records per page |
| `afterCursor` | Cursor to fetch the next page |
| `beforeCursor` | Cursor to fetch the previous page |
| `q` | Free-text search |

### Important notes

- `paginationKeys` **must** end with a **unique** column (typically `id`) to guarantee stable ordering.
- Cursors are base64-encoded strings — **never parse them manually**; relay them from response to the next request as-is.
- When `beforeCursor` is provided, ordering is automatically reversed and the result is flipped back — no manual handling needed.

### Response shape

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "afterCursor": "eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjQtMDEtMDEifQ==",
    "beforeCursor": "eyJpZCI6IjEwNCIsImNyZWF0ZWRBdCI6IjIwMjMtMTItMzEifQ==",
    "totalRecords": 20
  }
}
```

The client passes `afterCursor` to fetch the next page and `beforeCursor` to fetch the previous page.

---

## File structure

```
src/
  common/dto/
    infinity-pagination/
      paginated.dto.ts          ← InfinityPaginationResponseDto<T>, InfinityPaginationResponse()
    offset-pagination/
      page-options.dto.ts       ← query params (page, limit, order, q)
      offset-pagination.dto.ts  ← metadata (totalPages, currentPage, ...)
      paginated.dto.ts          ← OffsetPaginatedDto<T>
    cursor-pagination/
      page-options.dto.ts       ← query params (afterCursor, beforeCursor, limit, q)
      cursor-pagination.dto.ts  ← metadata (cursors, totalRecords)
      paginated.dto.ts          ← CursorPaginatedDto<T>
  utils/
    pagination/
      infinity-pagination.ts    ← infinityPagination() helper
      offset-pagination.ts      ← paginate() for TypeORM QueryBuilder
      cursor-pagination.ts      ← buildPaginator() + Paginator class
    types/
      pagination-options.ts     ← IPaginationOptions (internal use for infinity pagination)
```
