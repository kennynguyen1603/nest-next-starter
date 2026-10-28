import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Records who uploaded a file so URL lookups and profile-photo assignment can
 * be limited to the uploader. Existing rows keep a NULL owner.
 */
export class AddFileOwner1748000000010 implements MigrationInterface {
  name = 'AddFileOwner1748000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file" ADD COLUMN IF NOT EXISTS "ownerId" uuid`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "file" DROP COLUMN IF EXISTS "ownerId"`,
    );
  }
}
