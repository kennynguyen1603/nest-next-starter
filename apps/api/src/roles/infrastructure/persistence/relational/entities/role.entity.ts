import { BeforeInsert, Column, Entity, PrimaryColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';

@Entity({ name: 'role' })
export class RoleEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: String, unique: true })
  name!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }
}
