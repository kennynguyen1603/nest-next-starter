import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { NullableType } from '@/utils/types/nullable.type';
import { Role } from '@/roles/domain/role';
import { RoleEnum } from '@/roles/roles.enum';
import { PermissionEnum } from '@/roles/permissions.enum';
import { RolesRepository } from '../../roles.repository';
import { RoleMapper } from '../mappers/role.mapper';
import { RoleEntity } from '../entities/role.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { UserRoleEntity } from '../entities/user-role.entity';

@Injectable()
export class RolesRelationalRepository implements RolesRepository {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionRepo: Repository<PermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepo: Repository<UserRoleEntity>,
  ) {}

  async findAll(): Promise<Role[]> {
    const entities = await this.roleRepo.find();
    return entities.map((entity) => RoleMapper.toDomain(entity));
  }

  async findById(id: string): Promise<NullableType<Role>> {
    const entity = await this.roleRepo.findOne({ where: { id } });
    return entity ? RoleMapper.toDomain(entity) : null;
  }

  async getPermissionsForRoles(
    roleNames: RoleEnum[],
  ): Promise<PermissionEnum[]> {
    if (!roleNames.length) return [];
    const rows = await this.permissionRepo
      .createQueryBuilder('p')
      .innerJoin('role_permission', 'rp', 'rp.permission_id = p.id')
      .innerJoin('role', 'r', 'r.id = rp.role_id')
      .where('r.name IN (:...roleNames)', { roleNames })
      .select('p.name', 'name')
      .distinct(true)
      .getRawMany<{ name: string }>();
    return rows.map((row) => row.name as PermissionEnum);
  }

  async getRoleNamesForUser(userId: string): Promise<RoleEnum[]> {
    // Single JOIN query instead of 2 sequential queries
    const roles = await this.roleRepo
      .createQueryBuilder('role')
      .innerJoin('user_role', 'ur', 'ur.role_id = role.id')
      .where('ur.user_id = :userId', { userId })
      .select('role.name')
      .getMany();
    return roles.map((role) => role.name as RoleEnum);
  }

  async assignRolesToUser(
    userId: string,
    roleNames: RoleEnum[],
  ): Promise<void> {
    // Parallelize the independent DELETE and SELECT
    const [roles] = await Promise.all([
      roleNames.length
        ? this.roleRepo.find({ where: { name: In(roleNames) }, select: ['id'] })
        : Promise.resolve([]),
      this.userRoleRepo.delete({ userId }),
    ]);
    if (!roles.length) return;
    await this.userRoleRepo.save(
      roles.map((role) =>
        this.userRoleRepo.create({
          userId: String(userId),
          roleId: role.id,
        }),
      ),
    );
  }
}
