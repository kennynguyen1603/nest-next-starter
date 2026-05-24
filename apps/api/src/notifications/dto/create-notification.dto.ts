import { EnumField, StringField } from '@/decorators/field.decorators';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import { NotificationType } from '../notifications.enum';

export class CreateNotificationDto {
  @StringField()
  userId!: string;

  @EnumField(() => NotificationType)
  type!: NotificationType;

  @StringField({ maxLength: 255 })
  title!: string;

  @StringField()
  message!: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
