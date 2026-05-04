import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user_role' })
export class UserRoleEntity {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId!: string;
}
