import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserRoleSchemaDocument = HydratedDocument<UserRoleSchemaClass>;

@Schema({ collection: 'user_roles', timestamps: false })
export class UserRoleSchemaClass {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ type: String, required: true })
  roleId!: string;
}

export const UserRoleSchema = SchemaFactory.createForClass(UserRoleSchemaClass);
UserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });
UserRoleSchema.index({ userId: 1 });
