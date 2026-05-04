import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermissionEntity } from '@/roles/infrastructure/persistence/relational/entities/role-permission.entity';
import { RoleEntity } from '@/roles/infrastructure/persistence/relational/entities/role.entity';
import { ROLE_PERMISSIONS } from '@/roles/role-permissions.map';
import { PERMISSION_IDS } from '@/roles/permissions.enum';
import { RoleEnum } from '@/roles/roles.enum';

@Injectable()
export class RolePermissionSeedService {
  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly repository: Repository<RolePermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async run() {
    const roles = await this.roleRepository.find({ select: ['id', 'name'] });
    const roleNameToId = new Map(roles.map((r) => [r.name, r.id]));

    for (const roleName of Object.values(RoleEnum)) {
      const roleId = roleNameToId.get(roleName);
      if (!roleId) continue;

      const permissions = ROLE_PERMISSIONS[roleName] ?? [];
      for (const permissionName of permissions) {
        const permissionId = PERMISSION_IDS[permissionName];
        if (!permissionId) continue;

        const exists = await this.repository.count({
          where: { roleId, permissionId },
        });
        if (!exists) {
          await this.repository.save(
            this.repository.create({ roleId, permissionId }),
          );
        }
      }
    }
  }
}
