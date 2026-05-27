import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateRolePermissionTables1748000000003 implements MigrationInterface {
  name = 'CreateRolePermissionTables1748000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'role',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true },
          { name: 'name', type: 'varchar', isUnique: true, isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'permission',
        columns: [
          { name: 'id', type: 'int', isPrimary: true },
          { name: 'name', type: 'varchar', isUnique: true, isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'role_permission',
        columns: [
          { name: 'role_id', type: 'uuid', isPrimary: true },
          { name: 'permission_id', type: 'int', isPrimary: true },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'role',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['permission_id'],
            referencedTableName: 'permission',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('role_permission', true);
    await queryRunner.dropTable('permission', true);
    await queryRunner.dropTable('role', true);
  }
}
