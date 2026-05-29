import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';
import { UserMapper } from '@/users/infrastructure/persistence/relational/mappers/user.mapper';
import { Session } from '@/session/domain/session';
import { SessionEntity } from '../entities/session.entity';

export class SessionMapper {
  static toDomain(raw: SessionEntity): Session {
    const domainEntity = new Session();
    domainEntity.id = raw.id;
    if (raw.user) {
      domainEntity.user = UserMapper.toDomain(raw.user);
    }
    domainEntity.hash = raw.hash;
    domainEntity.deviceId = raw.deviceId;
    domainEntity.deviceName = raw.deviceName;
    domainEntity.ipAddress = raw.ipAddress;
    domainEntity.userAgent = raw.userAgent;
    domainEntity.platform = raw.platform;
    domainEntity.lastUsedAt = raw.lastUsedAt;
    domainEntity.createdAt = raw.createdAt;
    domainEntity.updatedAt = raw.updatedAt;
    if (raw.revokeAt) {
      domainEntity.revokeAt = raw.revokeAt;
    }
    domainEntity.revokeReason = raw.revokeReason as
      | import('@/session/domain/session').RevokeReason
      | undefined;
    return domainEntity;
  }

  static toPersistence(domainEntity: Session): SessionEntity {
    const user = new UserEntity();
    user.id = domainEntity.user.id;

    const persistenceEntity = new SessionEntity();
    if (domainEntity.id && typeof domainEntity.id === 'number') {
      persistenceEntity.id = domainEntity.id;
    }
    persistenceEntity.hash = domainEntity.hash;
    persistenceEntity.deviceId = domainEntity.deviceId;
    persistenceEntity.deviceName = domainEntity.deviceName;
    persistenceEntity.ipAddress = domainEntity.ipAddress;
    persistenceEntity.userAgent = domainEntity.userAgent;
    persistenceEntity.platform = domainEntity.platform;
    persistenceEntity.lastUsedAt = domainEntity.lastUsedAt;
    persistenceEntity.revokeReason = domainEntity.revokeReason;
    persistenceEntity.user = user;
    persistenceEntity.createdAt = domainEntity.createdAt;
    persistenceEntity.updatedAt = domainEntity.updatedAt;
    persistenceEntity.revokeAt = domainEntity.revokeAt;

    return persistenceEntity;
  }
}
