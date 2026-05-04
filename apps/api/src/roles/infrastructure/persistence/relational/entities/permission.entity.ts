import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';

@Entity({ name: 'permission' })
export class PermissionEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'int' })
  id!: number;

  @Column({ type: String, unique: true })
  name!: string;
}
