import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { EntityDocumentHelper } from '@/utils/document-entity-helper';
import { RoleEnum } from '@/roles/roles.enum';

@Schema({ collection: 'roles', timestamps: false })
export class RoleSchemaClass extends EntityDocumentHelper {
  @Prop({
    type: String,
    required: true,
    unique: true,
    enum: Object.values(RoleEnum),
  })
  name!: string;
}

export const RoleSchema = SchemaFactory.createForClass(RoleSchemaClass);
