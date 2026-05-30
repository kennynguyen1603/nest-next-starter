import { User } from '@/users/domain/user';
import { Session } from '@/session/domain/session';
import { SessionSchemaClass } from '../entities/session.schema';

export class SessionMapper {
  static toDomain(raw: SessionSchemaClass): Session {
    const domainEntity = new Session();
    domainEntity.id = raw._id.toString();

    if (raw.user) {
      const user = new User();
      user.id = raw.user.toString();
      domainEntity.user = user;
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

  static toPersistence(domainEntity: Session): SessionSchemaClass {
    const sessionEntity = new SessionSchemaClass();
    if (domainEntity.id && typeof domainEntity.id === 'string') {
      sessionEntity._id = domainEntity.id;
    }
    sessionEntity.user = domainEntity.user.id.toString();
    sessionEntity.hash = domainEntity.hash;
    sessionEntity.deviceId = domainEntity.deviceId;
    sessionEntity.deviceName = domainEntity.deviceName;
    sessionEntity.ipAddress = domainEntity.ipAddress;
    sessionEntity.userAgent = domainEntity.userAgent;
    sessionEntity.platform = domainEntity.platform;
    sessionEntity.lastUsedAt = domainEntity.lastUsedAt;
    sessionEntity.revokeReason = domainEntity.revokeReason;
    sessionEntity.createdAt = domainEntity.createdAt;
    sessionEntity.updatedAt = domainEntity.updatedAt;
    sessionEntity.revokeAt = domainEntity.revokeAt;
    return sessionEntity;
  }
}
