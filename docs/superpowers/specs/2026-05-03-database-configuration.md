# Database Configuration: MongoDB vs PostgreSQL

**Date:** 2026-05-03  
**Scope:** `apps/api/src/database/`, `apps/api/src/config/database/`

---

## Overview

The API supports two database backends, selected via the `DATABASE_TYPE` environment variable:

| Value | Database | ORM / Driver |
|---|---|---|
| `mongodb` | MongoDB | Mongoose (`@nestjs/mongoose`) |
| `postgres` | PostgreSQL | TypeORM (`@nestjs/typeorm`) |

The decision happens at **startup** in `app.module.ts`:

```typescript
const infrastructureDatabaseModule = (databaseConfig() as DatabaseConfig)
  .isDocumentDatabase
  ? MongooseModule.forRootAsync({ useClass: MongooseConfigService })
  : TypeOrmModule.forRootAsync({ useClass: TypeOrmConfigService, ... });
```

`isDocumentDatabase` is `true` when `DATABASE_TYPE === 'mongodb'`.

---

## Environment Variables

### Using a connection URL (both DB types)

The simplest approach — overrides all individual fields:

```env
DATABASE_URL=mongodb://user:pass@localhost:27017/mydb
# or
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
```

### Using individual fields (when no URL is provided)

```env
DATABASE_TYPE=postgres          # postgres | mongodb
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=myuser
DATABASE_PASSWORD=mypassword
DATABASE_NAME=mydb
```

### Optional settings

```env
DATABASE_SYNCHRONIZE=false      # TypeORM: auto-sync schema (do NOT use in production)
DATABASE_MAX_CONNECTIONS=100    # Connection pool size

# SSL (PostgreSQL only)
DATABASE_SSL_ENABLED=false
DATABASE_REJECT_UNAUTHORIZED=true
DATABASE_CA=<cert>
DATABASE_KEY=<key>
DATABASE_CERT=<cert>
```

---

## Architecture

```
src/config/database/
  database-config.type.ts      — DatabaseConfig type definition
  database.config.ts           — reads and validates env vars, returns DatabaseConfig

src/database/
  typeorm-config.service.ts    — NestJS factory service for TypeORM (PostgreSQL)
  mongoose-config.service.ts   — NestJS factory service for Mongoose (MongoDB)
  data-source.ts               — standalone DataSource for the TypeORM CLI (migrations)
  logger/
    database-logger.ts         — custom TypeORM logger backed by NestJS Logger
  seeds/
    relational/                — seed data for PostgreSQL
    document/                  — seed data for MongoDB
```

### Configuration flow

```
.env
  └─► database.config.ts  (validateConfig → DatabaseConfig)
        ├─► TypeOrmConfigService.createTypeOrmOptions()    [postgres]
        └─► MongooseConfigService.createMongooseOptions()  [mongodb]
```

`database.config.ts` uses the shared `validateConfig` utility (wrapping `class-validator`) to enforce:
- When `DATABASE_URL` is absent → `DATABASE_TYPE`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_PASSWORD`, `DATABASE_NAME`, and `DATABASE_USERNAME` are all required.
- When `DATABASE_URL` is present → the individual fields above are ignored.

---

## Migrations (TypeORM / PostgreSQL)

`data-source.ts` is a standalone DataSource for the TypeORM CLI. It reuses `databaseConfig()` directly instead of reading `process.env` manually, keeping the parsing logic in one place.

```bash
# Generate a migration
npx typeorm migration:generate src/database/migrations/InitSchema -d src/database/data-source.ts

# Run pending migrations
npx typeorm migration:run -d src/database/data-source.ts

# Revert the last migration
npx typeorm migration:revert -d src/database/data-source.ts
```

> **Note:** Make sure env vars are loaded before running the CLI (use `dotenv-cli` or export them in the shell).

---

## Seeds

Two separate seed sets exist, one per database type:

```bash
# PostgreSQL
npx ts-node src/database/seeds/relational/run-seed.ts

# MongoDB
npx ts-node src/database/seeds/document/run-seed.ts
```

The relational seed creates default roles (`admin`, `user`), statuses (`active`, `inactive`), and a default admin user.  
The document seed creates only the default admin user.

---

## Adding a new database type

1. Add the new value to the `DATABASE_TYPE` validator in `database.config.ts`.
2. Update `isDocumentDatabase` if it is a document-oriented DB.
3. Create a `<type>-config.service.ts` that implements the corresponding options factory interface.
4. Update the conditional in `app.module.ts`.
