import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { now, HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '@/utils/document-entity-helper';

export type SessionSchemaDocument = HydratedDocument<SessionSchemaClass>;

@Schema({ timestamps: true, toJSON: { virtuals: true, getters: true } })
export class SessionSchemaClass extends EntityDocumentHelper {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'UserSchemaClass' })
  user!: string;

  @Prop()
  hash!: string;

  @Prop({ required: false }) deviceId?: string;
  @Prop({ required: false }) deviceName?: string;
  @Prop({ required: false }) ipAddress?: string;
  @Prop({ required: false }) userAgent?: string;
  @Prop({ required: false }) platform?: string;
  @Prop({ required: false }) lastUsedAt?: Date;

  @Prop({ default: now })
  createdAt!: Date;

  @Prop({ default: now })
  updatedAt!: Date;

  @Prop()
  revokeAt?: Date;

  @Prop({ required: false }) revokeReason?: string;
}

export const SessionSchema = SchemaFactory.createForClass(SessionSchemaClass);
SessionSchema.index({ user: 1 });
SessionSchema.index({ deviceId: 1 });
