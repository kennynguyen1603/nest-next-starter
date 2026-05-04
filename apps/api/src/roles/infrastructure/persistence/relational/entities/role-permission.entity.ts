import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'role_permission' })
export class RolePermissionEntity {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @PrimaryColumn({ name: 'permission_id', type: 'int' })
  permissionId!: number;
}
