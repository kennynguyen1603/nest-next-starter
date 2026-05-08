import { FileEntity } from '@/files/infrastructure/persistence/relational/entities/file.entity';
import { FileMapper } from '@/files/infrastructure/persistence/relational/mappers/file.mapper';
import { RoleEntity } from '@/roles/infrastructure/persistence/relational/entities/role.entity';
import { RoleEnum } from '@/roles/roles.enum';
import { Role } from '@/roles/domain/role';
import { User } from '@/users/domain/user';
import { UserEntity } from '../entities/user.entity';

export class UserMapper {
  static toDomain(raw: UserEntity): User {
    const domainEntity = new User();
    domainEntity.id = raw.id;
    domainEntity.email = raw.email;
    domainEntity.password = raw.password;
    domainEntity.provider = raw.provider;
    domainEntity.socialId = raw.socialId;
    domainEntity.firstName = raw.firstName;
    domainEntity.lastName = raw.lastName;
    if (raw.photo) {
      domainEntity.photo = FileMapper.toDomain(raw.photo);
    }
    domainEntity.roles = raw.roles?.map((rawRole) => {
      const role = new Role();
      role.id = rawRole.id;
      role.name = rawRole.name as RoleEnum;
      return role;
    });
    domainEntity.status = raw.status ?? undefined;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    if (raw.deletedAt) domainEntity.deletedAt = raw.deletedAt;
    return domainEntity;
  }

  static toPersistence(domainEntity: User): UserEntity {
    let roles: RoleEntity[] | undefined = undefined;
    if (domainEntity.roles) {
      roles = domainEntity.roles.map((role) => {
        const roleEntity = new RoleEntity();
        if (role.id) roleEntity.id = role.id;
        if (role.name) roleEntity.name = role.name;
        return roleEntity;
      });
    }

    let photo: FileEntity | undefined | null = undefined;
    if (domainEntity.photo) {
      photo = new FileEntity();
      photo.id = domainEntity.photo.id;
      photo.path = domainEntity.photo.path;
    } else if (domainEntity.photo === null) {
      photo = null;
    }

    const persistenceEntity = new UserEntity();
    if (domainEntity.id) {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.email = domainEntity.email;
    persistenceEntity.password = domainEntity.password;
    persistenceEntity.provider = domainEntity.provider;
    persistenceEntity.socialId = domainEntity.socialId;
    persistenceEntity.firstName = domainEntity.firstName;
    persistenceEntity.lastName = domainEntity.lastName;
    persistenceEntity.photo = photo;
    persistenceEntity.roles = roles;
    persistenceEntity.status = domainEntity.status;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.deletedAt = domainEntity.deletedAt;
    return persistenceEntity;
  }
}
