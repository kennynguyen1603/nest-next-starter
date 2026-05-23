import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { EntityRelationalHelper } from '@/utils/relational-entity-helper';
import { NotificationType } from '@/notifications/notifications.enum';

@Entity({ name: 'notification' })
export class NotificationEntity extends EntityRelationalHelper {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = uuidv7();
  }

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'json', nullable: true })
  data?: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
