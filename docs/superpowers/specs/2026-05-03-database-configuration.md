# Cấu hình Database: MongoDB vs PostgreSQL

**Date:** 2026-05-03  
**Scope:** `apps/api/src/database/`, `apps/api/src/config/database/`

---

## Tổng quan

API hỗ trợ hai loại database, chọn qua biến môi trường `DATABASE_TYPE`:

| Giá trị | Database | ORM/Driver |
|---|---|---|
| `mongodb` | MongoDB | Mongoose (`@nestjs/mongoose`) |
| `postgres` | PostgreSQL | TypeORM (`@nestjs/typeorm`) |

Quyết định được thực hiện tại **build time** trong `app.module.ts`:

```typescript
const infrastructureDatabaseModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? MongooseModule.forRootAsync({ useClass: MongooseConfigService })
  : TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService, ... });
```

`isDocumentDatabase` là `true` khi `DATABASE_TYPE === 'mongodb'`.

---

## Cấu hình biến môi trường

### Dùng connection URL (cả hai loại DB)

Phương pháp đơn giản nhất, ghi đè toàn bộ các trường rời:

```env
DATABASE_URL=mongodb://user:pass@localhost:27017/mydb
# hoặc
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

### Dùng các trường rời (khi không có URL)

```env
DATABASE_TYPE=postgres          # postgres | mongodb
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=myuser
DATABASE_PASSWORD=mypassword
DATABASE_NAME=mydb
```

### Tùy chọn thêm

```env
DATABASE_SYNCHRONIZE=false      # TypeORM: tự đồng bộ schema (không dùng production)
DATABASE_MAX_CONNECTIONS=100    # Số connection tối đa trong pool

# SSL (PostgreSQL)
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=true
DATABASE_CA=<cert>
DATABASE_KEY=<key>
DATABASE_CERT=<cert>
```

---

## Kiến trúc

```
src/config/database/
  database-config.type.ts   — kiểu DatabaseConfig
  database.config.ts        — đọc + validate env vars, trả về DatabaseConfig

src/database/
  typeorm-config.service.ts    — NestJS service cho TypeORM (PostgreSQL)
  mongoose-config.service.ts   — NestJS service cho Mongoose (MongoDB)
  data-source.ts               — DataSource standalone cho TypeORM CLI (migrations)
  logger/
    database-logger.ts         — Custom logger tích hợp NestJS Logger
  seeds/
    relational/                — Seeds cho PostgreSQL
    document/                  — Seeds cho MongoDB
```

### Luồng cấu hình

```
.env
  └─► database.config.ts (validateConfig → DatabaseConfig)
        ├─► TypeOrmConfigService.createTypeOrmOptions()   [postgres]
        └─► MongooseConfigService.createMongooseOptions() [mongodb]
```

`database.config.ts` dùng `validateConfig` (wrapper của `class-validator`) để đảm bảo:
- Nếu không có `DATABASE_URL` → bắt buộc phải có `DATABASE_TYPE`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_USERNAME`
- Nếu có `DATABASE_URL` → các trường trên được bỏ qua

---

## Migrations (TypeORM / PostgreSQL)

`data-source.ts` là DataSource standalone cho TypeORM CLI, dùng lại `databaseConfig()` để parse env thay vì đọc `process.env` trực tiếp:

```bash
# Tạo migration
npx typeorm migration:generate src/database/migrations/InitSchema -d src/database/data-source.ts

# Chạy migration
npx typeorm migration:run -d src/database/data-source.ts

# Rollback
npx typeorm migration:revert -d src/database/data-source.ts
```

> **Lưu ý:** Đảm bảo env vars đã được load trước khi chạy CLI (dùng `dotenv-cli` hoặc export trực tiếp).

---

## Seeds

Có hai bộ seed tách biệt theo loại DB:

```bash
# PostgreSQL
npx ts-node src/database/seeds/relational/run-seed.ts

# MongoDB
npx ts-node src/database/seeds/document/run-seed.ts
```

Seed cho PostgreSQL tạo sẵn roles (`admin`, `user`), statuses (`active`, `inactive`) và user mặc định.  
Seed cho MongoDB chỉ tạo user mặc định.

---

## Thêm database type mới

1. Thêm giá trị vào `DATABASE_TYPE` validator trong `database.config.ts`
2. Cập nhật `isDocumentDatabase` nếu là document DB
3. Tạo `<type>-config.service.ts` implement interface factory tương ứng
4. Cập nhật điều kiện trong `app.module.ts`
