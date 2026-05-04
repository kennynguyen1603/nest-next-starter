import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RolePermissionSchemaDocument =
  HydratedDocument<RolePermissionSchemaClass>;

@Schema({ collection: 'role_permissions', timestamps: false })
export class RolePermissionSchemaClass {
  @Prop({ type: String, required: true })
  roleId!: string;

  @Prop({ type: String, required: true })
  permissionName!: string;
}

export const RolePermissionSchema = SchemaFactory.createForClass(
  RolePermissionSchemaClass,
);
RolePermissionSchema.index({ roleId: 1, permissionName: 1 }, { unique: true });
RolePermissionSchema.index({ roleId: 1 });
