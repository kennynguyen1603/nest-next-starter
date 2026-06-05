import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes for the hot read paths that the composite/junction lookups rely on:
 * - role_permission(permission_id): the permission JOIN leads with permission_id,
 *   which the (role_id, permission_id) primary key cannot serve.
 * - user_role(role_id): reverse lookups / role-filtered user listing lead with role_id.
 * - notification(userId, isRead, createdAt DESC): per-user list + unread filter + sort.
 */
export class AddPerformanceIndexes1748000000008 implements MigrationInterface {
  name = 'AddPerformanceIndexes1748000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_role_permission_permission_id" ON "role_permission" ("permission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_role_role_id" ON "user_role" ("role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_userId_isRead_createdAt" ON "notification" ("userId", "isRead", "createdAt" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_userId_isRead_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_role_role_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_role_permission_permission_id"`,
    );
  }
}
