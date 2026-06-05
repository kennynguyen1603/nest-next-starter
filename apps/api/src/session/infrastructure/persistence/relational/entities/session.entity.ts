import {
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';

@Entity({ name: 'session' })
export class SessionEntity extends EntityRelationalHelper {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => UserEntity)
  @Index()
  user!: UserEntity;

  @Column()
  hash!: string;

  @Column({ nullable: true }) deviceId?: string;
  @Column({ nullable: true }) deviceName?: string;
  @Column({ nullable: true }) ipAddress?: string;
  @Column({ type: 'text', nullable: true }) userAgent?: string;
  @Column({ nullable: true }) platform?: string;
  @Column({ type: 'timestamp', nullable: true }) lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  revokeAt?: Date;

  @Column({ nullable: true }) revokeReason?: string;
}
