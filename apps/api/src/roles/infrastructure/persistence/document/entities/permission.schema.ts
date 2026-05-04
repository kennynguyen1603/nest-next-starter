import { EntityDocumentHelper } from '@/utils/document-entity-helper';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PermissionSchemaDocument = HydratedDocument<PermissionSchemaClass>;

@Schema({ collection: 'permissions', timestamps: false })
export class PermissionSchemaClass extends EntityDocumentHelper {
  @Prop({ type: String, required: true, unique: true })
  name!: string;
}

export const PermissionSchema = SchemaFactory.createForClass(
  PermissionSchemaClass,
);
PermissionSchema.index({ name: 1 }, { unique: true });
