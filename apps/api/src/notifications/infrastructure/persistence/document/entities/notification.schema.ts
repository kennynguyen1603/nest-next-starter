import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '@/utils/document-entity-helper';
import { NotificationType } from '@/notifications/notifications.enum';

export type NotificationSchemaDocument =
  HydratedDocument<NotificationSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
})
export class NotificationSchemaClass extends EntityDocumentHelper {
  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true })
  type!: NotificationType;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  message!: string;

  @Prop({ type: Object, default: null })
  data?: Record<string, unknown> | null;

  @Prop({ type: Boolean, default: false, index: true })
  isRead!: boolean;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  @Prop({ default: now })
  createdAt!: Date;

  @Prop({ default: now })
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(
  NotificationSchemaClass,
);
