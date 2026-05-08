import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  ManyToMany,
  JoinTable,
  PrimaryColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { RoleEntity } from '@/roles/infrastructure/persistence/relational/entities/role.entity';
import { UserStatus } from '@/users/user-status.enum';
import { FileEntity } from '@/files/infrastructure/persistence/relational/entities/file.entity';
import { AuthProvidersEnum } from '@/auth/auth-providers.enum';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';

@Entity({ name: 'user' })
export class UserEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }

  @Column({ type: String, unique: true, nullable: true })
  email!: string | null;

  @Column({ nullable: true })
  password?: string;

  @Column({ default: AuthProvidersEnum.EMAIL })
  provider!: string;

  @Index()
  @Column({ type: String, nullable: true })
  socialId?: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  firstName!: string | null;

  @Index()
  @Column({ type: String, nullable: true })
  lastName!: string | null;

  @OneToOne(() => FileEntity, { eager: true })
  @JoinColumn()
  photo?: FileEntity | null;

  @ManyToMany(() => RoleEntity, { eager: true })
  @JoinTable({
    name: 'user_role',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles?: RoleEntity[];

  @Column({ type: 'varchar', length: 20, nullable: true })
  status?: UserStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date | null;
}
