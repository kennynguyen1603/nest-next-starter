import { User } from '@/users/domain/user';
import { NullableType } from '@/utils/types/nullable.type';
import { Session } from '../../domain/session';
import { RevokeReason } from '../../domain/session';

export abstract class SessionRepository {
  abstract findById(id: Session['id']): Promise<NullableType<Session>>;

  abstract findByUserId(userId: User['id']): Promise<Session[]>;

  abstract create(
    data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'revokeAt'>,
  ): Promise<Session>;

  abstract update(
    id: Session['id'],
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'revokeAt'>
    >,
  ): Promise<Session | null>;

  abstract updateByHash(
    conditions: { id: Session['id']; hash: Session['hash'] },
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'revokeAt'>
    >,
  ): Promise<Session | null>;

  abstract deleteById(
    id: Session['id'],
    revokeReason?: RevokeReason,
  ): Promise<void>;

  abstract deleteByUserId(
    conditions: { userId: User['id'] },
    revokeReason?: RevokeReason,
  ): Promise<void>;

  abstract deleteByUserIdWithExclude(
    conditions: {
      userId: User['id'];
      excludeSessionId: Session['id'];
    },
    revokeReason?: RevokeReason,
  ): Promise<void>;

  abstract enforceSessionLimit(
    userId: User['id'],
    maxSessions: number,
  ): Promise<void>;
}
