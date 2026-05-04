import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { NullableType } from '@/utils/types/nullable.type';
import { Role } from '@/roles/domain/role';
import { RoleEnum } from '@/roles/roles.enum';
import { PermissionEnum } from '@/roles/permissions.enum';
import { RolesRepository } from '@/roles/infrastructure/persistence/roles.repository';
import { RoleMapper } from '../mappers/role.mapper';
import { RoleSchemaClass } from '../entities/role.schema';
import { RolePermissionSchemaClass } from '../entities/role-permission.schema';
import { UserRoleSchemaClass } from '../entities/user-role.schema';

@Injectable()
export class RolesDocumentRepository implements RolesRepository {
  constructor(
    @InjectModel(RoleSchemaClass.name)
    private readonly roleModel: Model<RoleSchemaClass>,
    @InjectModel(RolePermissionSchemaClass.name)
    private readonly rolePermissionModel: Model<RolePermissionSchemaClass>,
    @InjectModel(UserRoleSchemaClass.name)
    private readonly userRoleModel: Model<UserRoleSchemaClass>,
  ) {}

  async findAll(): Promise<Role[]> {
    const roleDocs = await this.roleModel.find().lean();
    return roleDocs.map((roleDoc) =>
      RoleMapper.toDomain(roleDoc as RoleSchemaClass),
    );
  }

  async findById(id: string): Promise<NullableType<Role>> {
    const roleDoc = await this.roleModel.findById(id).lean();
    return roleDoc ? RoleMapper.toDomain(roleDoc as RoleSchemaClass) : null;
  }

  async getPermissionsForRoles(
    roleNames: RoleEnum[],
  ): Promise<PermissionEnum[]> {
    if (!roleNames.length) return [];
    const roles = await this.roleModel
      .find({ name: { $in: roleNames } }, { _id: 1 })
      .lean();
    if (!roles.length) return [];
    const roleIds = roles.map((role) => role._id.toString());
    const rolePermissions = await this.rolePermissionModel
      .find({ roleId: { $in: roleIds } }, { permissionName: 1 })
      .lean();
    return [
      ...new Set(
        rolePermissions.map(
          (rolePermission) => rolePermission.permissionName as PermissionEnum,
        ),
      ),
    ];
  }

  async getRoleNamesForUser(userId: string | number): Promise<RoleEnum[]> {
    const userRoleDocs = await this.userRoleModel
      .find({ userId: userId.toString() }, { roleId: 1 })
      .lean();
    if (!userRoleDocs.length) return [];
    const roleIds = userRoleDocs.map((userRoleDoc) => userRoleDoc.roleId);
    const roles = await this.roleModel
      .find({ _id: { $in: roleIds } }, { name: 1 })
      .lean<{ name: RoleEnum }[]>();
    return roles.map((role) => role.name);
  }

  async assignRolesToUser(
    userId: string | number,
    roleNames: RoleEnum[],
  ): Promise<void> {
    await this.userRoleModel.deleteMany({ userId: userId.toString() });
    if (!roleNames.length) return;
    const roles = await this.roleModel
      .find({ name: { $in: roleNames } }, { _id: 1 })
      .lean();
    await this.userRoleModel.insertMany(
      roles.map((role) => ({
        userId: userId.toString(),
        roleId: role._id.toString(),
      })),
    );
  }
}
