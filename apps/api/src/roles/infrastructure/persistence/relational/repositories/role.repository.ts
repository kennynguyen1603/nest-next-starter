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

  async getRoleNamesForUser(userId: string | number): Promise<RoleEnum[]> {
    const userRoles = await this.userRoleRepo.find({
      where: { userId: Number(userId) },
      select: ['roleId'],
    });
    if (!userRoles.length) return [];
    const roles = await this.roleRepo.find({
      where: { id: In(userRoles.map((userRole) => userRole.roleId)) },
      select: ['name'],
    });
    return roles.map((role) => role.name as RoleEnum);
  }

  async assignRolesToUser(
    userId: string | number,
    roleNames: RoleEnum[],
  ): Promise<void> {
    await this.userRoleRepo.delete({ userId: Number(userId) });
    if (!roleNames.length) return;
    const roles = await this.roleRepo.find({
      where: { name: In(roleNames) },
      select: ['id'],
    });
    await this.userRoleRepo.save(
      roles.map((role) =>
        this.userRoleRepo.create({
          userId: Number(userId),
          roleId: role.id,
        }),
      ),
    );
  }
}
