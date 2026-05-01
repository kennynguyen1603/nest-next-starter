import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';
import { RoleEnum } from '@/roles/roles.enum';

@Entity({ name: 'role' })
export class RoleEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: String })
  id!: RoleEnum;

  @Column()
  name?: string;
}
