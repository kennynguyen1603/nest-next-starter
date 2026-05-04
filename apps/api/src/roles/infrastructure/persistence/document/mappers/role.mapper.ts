import { Role } from '@/roles/domain/role';
import { RoleEnum } from '@/roles/roles.enum';
import { RoleSchemaClass } from '../entities/role.schema';

export class RoleMapper {
  static toDomain(raw: RoleSchemaClass): Role {
    const domain = new Role();
    domain.id = raw._id.toString();
    domain.name = raw.name as RoleEnum;
    return domain;
  }

  static toPersistence(domain: Role): Partial<RoleSchemaClass> {
    return { name: domain.name };
  }
}
