import { User } from '@/users/domain/user';
import { Role } from '@/roles/domain/role';
import { RoleEnum } from '@/roles/roles.enum';
import { UserStatus } from '@/users/user-status.enum';
import { FileMapper } from '@/files/infrastructure/persistence/document/mappers/file.mapper';
import { UserSchemaClass } from '../entities/user.schema';
import { FileSchemaClass } from '@/files/infrastructure/persistence/document/entities/file.schema';
import { RoleSchemaClass } from '@/roles/infrastructure/persistence/document/entities/role.schema';

export class UserMapper {
  static toDomain(raw: UserSchemaClass, roleSchemas?: RoleSchemaClass[]): User {
    const domainEntity = new User();
    domainEntity.id = raw._id.toString();
    domainEntity.email = raw.email;
    domainEntity.password = raw.password;
    domainEntity.provider = raw.provider;
    domainEntity.socialId = raw.socialId;
    domainEntity.firstName = raw.firstName;
    domainEntity.lastName = raw.lastName;

    if (raw.photo) {
      domainEntity.photo = FileMapper.toDomain(raw.photo);
    } else if (raw.photo === null) {
      domainEntity.photo = null;
    }

    if (roleSchemas?.length) {
      domainEntity.roles = roleSchemas.map((r) => {
        const role = new Role();
        role.id = r._id.toString();
        role.name = r.name as RoleEnum;
        return role;
      });
    }

    domainEntity.status = (raw.status as UserStatus) ?? undefined;

    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    if (raw.deletedAt) {
      domainEntity.deletedAt = raw.deletedAt;
    }

    return domainEntity;
  }

  static toPersistence(domainEntity: User): UserSchemaClass {
    let photo: FileSchemaClass | undefined = undefined;
    if (domainEntity.photo) {
      photo = new FileSchemaClass();
      photo._id = domainEntity.photo.id;
      photo.path = domainEntity.photo.path;
    }

    const persistenceSchema = new UserSchemaClass();
    if (domainEntity.id) {
      persistenceSchema._id = domainEntity.id;
    }
    persistenceSchema.email = domainEntity.email;
    persistenceSchema.password = domainEntity.password;
    persistenceSchema.provider = domainEntity.provider;
    persistenceSchema.socialId = domainEntity.socialId;
    persistenceSchema.firstName = domainEntity.firstName;
    persistenceSchema.lastName = domainEntity.lastName;
    persistenceSchema.photo = photo;
    persistenceSchema.status = domainEntity.status;
    persistenceSchema.createdAt = domainEntity.createdAt;
    persistenceSchema.updatedAt = domainEntity.updatedAt;
    persistenceSchema.deletedAt = domainEntity.deletedAt;
    return persistenceSchema;
  }
}
