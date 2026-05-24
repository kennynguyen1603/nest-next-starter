import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { NotificationType } from '../notifications.enum';

export class Notification {
  @ApiProperty({ type: String })
  @Expose()
  id!: string;

  @ApiProperty({ type: String })
  @Expose()
  userId!: string;

  @ApiProperty({ enum: NotificationType })
  @Expose()
  type!: NotificationType;

  @ApiProperty({ type: String })
  @Expose()
  title!: string;

  @ApiProperty({ type: String })
  @Expose()
  message!: string;

  @ApiProperty({ type: Object, nullable: true })
  @Expose()
  data?: Record<string, unknown> | null;

  @ApiProperty({ type: Boolean })
  @Expose()
  isRead!: boolean;

  @ApiProperty({ nullable: true })
  @Expose()
  readAt?: Date | null;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty()
  @Expose()
  updatedAt!: Date;
}
