import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateFileTable1748000000002 implements MigrationInterface {
  name = 'CreateFileTable1748000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'file',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            isGenerated: true,
          },
          { name: 'path', type: 'varchar', isNullable: false },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('file', true);
  }
}
