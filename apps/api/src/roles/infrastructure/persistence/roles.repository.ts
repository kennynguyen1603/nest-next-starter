import { NullableType } from '@/utils/types/nullable.type';
import { Role } from '@/roles/domain/role';
import { RoleEnum } from '@/roles/roles.enum';
import { PermissionEnum } from '@/roles/permissions.enum';

export abstract class RolesRepository {
  abstract findAll(): Promise<Role[]>;
  abstract findById(id: string): Promise<NullableType<Role>>;
  abstract getPermissionsForRoles(
    roleNames: RoleEnum[],
  ): Promise<PermissionEnum[]>;
  abstract getRoleNamesForUser(userId: string | number): Promise<RoleEnum[]>;
  abstract assignRolesToUser(
    userId: string | number,
    roleNames: RoleEnum[],
  ): Promise<void>;
}
