import { Injectable } from '@nestjs/common';

import { NullableType } from '@/utils/types/nullable.type';
import { RolesRepository } from './infrastructure/persistence/roles.repository';
import { Role } from './domain/role';
import { RoleEnum } from './roles.enum';
import { PermissionEnum } from './permissions.enum';
import { CacheService } from '@/shared/cache/cache.service';

const PERMISSIONS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly cacheService: CacheService,
  ) {}

  findAll(): Promise<Role[]> {
    return this.rolesRepository.findAll();
  }

  findById(id: string): Promise<NullableType<Role>> {
    return this.rolesRepository.findById(id);
  }

  async getPermissionsForRoles(
    roleNames: RoleEnum[],
  ): Promise<PermissionEnum[]> {
    if (!roleNames.length) return [];

    const cacheArg = [...roleNames].sort().join(',');
    const cached = await this.cacheService.get<PermissionEnum[]>({
      key: 'RolePermissions',
      args: [cacheArg],
    });
    if (cached) return cached;

    const permissions =
      await this.rolesRepository.getPermissionsForRoles(roleNames);
    await this.cacheService.set(
      { key: 'RolePermissions', args: [cacheArg] },
      permissions,
      { ttl: PERMISSIONS_CACHE_TTL_MS },
    );
    return permissions;
  }

  getRoleNamesForUser(userId: string): Promise<RoleEnum[]> {
    return this.rolesRepository.getRoleNamesForUser(userId);
  }

  assignRolesToUser(userId: string, roleNames: RoleEnum[]): Promise<void> {
    return this.rolesRepository.assignRolesToUser(userId, roleNames);
  }
}
