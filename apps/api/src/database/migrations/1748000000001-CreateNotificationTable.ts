import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotificationTable1748000000001 implements MigrationInterface {
  name = 'CreateNotificationTable1748000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notification',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'userId', type: 'uuid', isNullable: false },
          { name: 'type', type: 'varchar', length: '50', isNullable: false },
          { name: 'title', type: 'varchar', length: '255', isNullable: false },
          { name: 'message', type: 'text', isNullable: false },
          { name: 'data', type: 'jsonb', isNullable: true },
          {
            name: 'isRead',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          { name: 'readAt', type: 'timestamp', isNullable: true },
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
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notification',
      new TableIndex({
        name: 'IDX_notification_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'notification',
      new TableIndex({
        name: 'IDX_notification_isRead',
        columnNames: ['isRead'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification', true);
  }
}
