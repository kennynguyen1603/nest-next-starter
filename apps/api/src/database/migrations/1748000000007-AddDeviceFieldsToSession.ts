import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddDeviceFieldsToSession1748000000007 implements MigrationInterface {
  name = 'AddDeviceFieldsToSession1748000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.renameColumn('session', 'deletedAt', 'revokeAt');

    await queryRunner.addColumns('session', [
      new TableColumn({
        name: 'revokeReason',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'deviceId',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'deviceName',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'ipAddress',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'userAgent',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'platform',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'lastUsedAt',
        type: 'timestamp',
        isNullable: true,
      }),
    ]);

    await queryRunner.createIndex(
      'session',
      new TableIndex({
        name: 'IDX_session_deviceId',
        columnNames: ['deviceId'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('session', 'IDX_session_deviceId');

    await queryRunner.dropColumns('session', [
      'revokeReason',
      'deviceId',
      'deviceName',
      'ipAddress',
      'userAgent',
      'platform',
      'lastUsedAt',
    ]);

    await queryRunner.renameColumn('session', 'revokeAt', 'deletedAt');
  }
}
