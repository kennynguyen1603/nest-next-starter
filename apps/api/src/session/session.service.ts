import { Injectable } from '@nestjs/common';

import { SessionRepository } from './infrastructure/persistence/session.repository';
import { Session } from './domain/session';
import { RevokeReason } from './domain/session';
import { User } from '../users/domain/user';
import { NullableType } from '../utils/types/nullable.type';

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  findById(id: Session['id']): Promise<NullableType<Session>> {
    return this.sessionRepository.findById(id);
  }

  findByUserId(userId: User['id']): Promise<Session[]> {
    return this.sessionRepository.findByUserId(userId);
  }

  create(
    data: Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'revokeAt'>,
  ): Promise<Session> {
    return this.sessionRepository.create(data);
  }

  update(
    id: Session['id'],
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'revokeAt'>
    >,
  ): Promise<Session | null> {
    return this.sessionRepository.update(id, payload);
  }

  updateByHash(
    conditions: { id: Session['id']; hash: Session['hash'] },
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'revokeAt'>
    >,
  ): Promise<Session | null> {
    return this.sessionRepository.updateByHash(conditions, payload);
  }

  deleteById(id: Session['id'], revokeReason?: RevokeReason): Promise<void> {
    return this.sessionRepository.deleteById(id, revokeReason);
  }

  deleteByUserId(
    conditions: { userId: User['id'] },
    revokeReason?: RevokeReason,
  ): Promise<void> {
    return this.sessionRepository.deleteByUserId(conditions, revokeReason);
  }

  deleteByUserIdWithExclude(
    conditions: {
      userId: User['id'];
      excludeSessionId: Session['id'];
    },
    revokeReason?: RevokeReason,
  ): Promise<void> {
    return this.sessionRepository.deleteByUserIdWithExclude(
      conditions,
      revokeReason,
    );
  }

  enforceSessionLimit(userId: User['id'], maxSessions: number): Promise<void> {
    return this.sessionRepository.enforceSessionLimit(userId, maxSessions);
  }
}
