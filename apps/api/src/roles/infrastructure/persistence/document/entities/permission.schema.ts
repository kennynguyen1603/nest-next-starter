import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionSchemaDocument = HydratedDocument<PermissionSchemaClass>;

@Schema({ collection: 'permissions', timestamps: false })
export class PermissionSchemaClass {
  @Prop({ type: Number, required: true, unique: true })
  _id!: number;

  @Prop({ type: String, required: true, unique: true })
  name!: string;
}

export const PermissionSchema =
  SchemaFactory.createForClass(PermissionSchemaClass);
