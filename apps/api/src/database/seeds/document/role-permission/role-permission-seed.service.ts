import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RolePermissionSchemaClass } from '@/roles/infrastructure/persistence/document/entities/role-permission.schema';
import { RoleSchemaClass } from '@/roles/infrastructure/persistence/document/entities/role.schema';
import { ROLE_PERMISSIONS } from '@/roles/role-permissions.map';
import { RoleEnum } from '@/roles/roles.enum';

@Injectable()
export class RolePermissionSeedService {
  constructor(
    @InjectModel(RolePermissionSchemaClass.name)
    private readonly model: Model<RolePermissionSchemaClass>,
    @InjectModel(RoleSchemaClass.name)
    private readonly roleModel: Model<RoleSchemaClass>,
  ) {}

  async run() {
    const roles = await this.roleModel
      .find({}, { _id: 1, name: 1 })
      .lean<{ _id: unknown; name: string }[]>();
    const roleNameToId = new Map(roles.map((r) => [r.name, String(r._id)]));

    for (const roleName of Object.values(RoleEnum)) {
      const roleId = roleNameToId.get(roleName);
      if (!roleId) continue;

      const permissions = ROLE_PERMISSIONS[roleName] ?? [];
      for (const permissionName of permissions) {
        const exists = await this.model.exists({ roleId, permissionName });
        if (!exists) {
          await this.model.create({ roleId, permissionName });
        }
      }
    }
  }
}
