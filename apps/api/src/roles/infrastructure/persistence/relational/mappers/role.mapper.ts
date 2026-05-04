import { Role } from '@/roles/domain/role';
import { RoleEnum } from '@/roles/roles.enum';
import { RoleEntity } from '../entities/role.entity';

export class RoleMapper {
  static toDomain(raw: RoleEntity): Role {
    const domain = new Role();
    domain.id = raw.id;
    domain.name = raw.name as RoleEnum;
    return domain;
  }

  static toPersistence(domain: Role): RoleEntity {
    const entity = new RoleEntity();
    if (domain.id) entity.id = domain.id;
    entity.name = domain.name;
    return entity;
  }
}
