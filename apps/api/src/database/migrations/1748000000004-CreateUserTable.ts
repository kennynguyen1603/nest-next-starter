import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateUserTable1748000000004 implements MigrationInterface {
  name = 'CreateUserTable1748000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'email', type: 'varchar', isUnique: true, isNullable: true },
          { name: 'password', type: 'varchar', isNullable: true },
          {
            name: 'provider',
            type: 'varchar',
            default: "'email'",
            isNullable: false,
          },
          { name: 'socialId', type: 'varchar', isNullable: true },
          { name: 'firstName', type: 'varchar', isNullable: true },
          { name: 'lastName', type: 'varchar', isNullable: true },
          { name: 'photoId', type: 'uuid', isNullable: true },
          { name: 'status', type: 'varchar', length: '20', isNullable: true },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['photoId'],
            referencedTableName: 'file',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'user',
      new TableIndex({ name: 'IDX_user_socialId', columnNames: ['socialId'] }),
    );
    await queryRunner.createIndex(
      'user',
      new TableIndex({
        name: 'IDX_user_firstName',
        columnNames: ['firstName'],
      }),
    );
    await queryRunner.createIndex(
      'user',
      new TableIndex({ name: 'IDX_user_lastName', columnNames: ['lastName'] }),
    );
    await queryRunner.createIndex(
      'user',
      new TableIndex({ name: 'IDX_user_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'user',
      new TableIndex({
        name: 'IDX_user_createdAt',
        columnNames: ['createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'user',
      new TableIndex({
        name: 'IDX_user_deletedAt',
        columnNames: ['deletedAt'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user', true);
  }
}
