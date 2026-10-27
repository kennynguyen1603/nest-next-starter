import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Index for the active-session reads in SessionRelationalRepository:
 * - findByUserId: WHERE userId AND revokeAt IS NULL ORDER BY lastUsedAt DESC, createdAt DESC
 * - enforceSessionLimit / deleteByUserId*: WHERE userId AND revokeAt IS NULL
 * Partial on revokeAt IS NULL so revoked sessions, which accumulate over time,
 * stay out of the index. Mirrors the Mongo (user, lastUsedAt, createdAt) index.
 */
export class AddSessionActivityIndex1748000000009 implements MigrationInterface {
  name = 'AddSessionActivityIndex1748000000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_session_userId_lastUsedAt_createdAt" ON "session" ("userId", "lastUsedAt" DESC, "createdAt" DESC) WHERE "revokeAt" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_session_userId_lastUsedAt_createdAt"`,
    );
  }
}
