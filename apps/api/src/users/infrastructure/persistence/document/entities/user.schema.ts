import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { now, HydratedDocument } from 'mongoose';

import { EntityDocumentHelper } from '@/utils/document-entity-helper';
import { AuthProvidersEnum } from '@/auth/auth-providers.enum';
import { FileSchemaClass } from '@/files/infrastructure/persistence/document/entities/file.schema';
import { UserStatus } from '@/users/user-status.enum';

export type UserSchemaDocument = HydratedDocument<UserSchemaClass>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true,
  },
})
export class UserSchemaClass extends EntityDocumentHelper {
  @Prop({ type: String, unique: true })
  email!: string | null;

  @Prop()
  password?: string;

  @Prop({ default: AuthProvidersEnum.EMAIL })
  provider!: string;

  @Prop({ type: String, default: null })
  socialId?: string | null;

  @Prop({ type: String })
  firstName!: string | null;

  @Prop({ type: String })
  lastName!: string | null;

  @Prop({ type: FileSchemaClass })
  photo?: FileSchemaClass | null;

  @Prop({ type: String })
  status?: UserStatus;

  @Prop({ default: now })
  createdAt!: Date;

  @Prop({ default: now })
  updatedAt!: Date;

  @Prop()
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserSchemaClass);
