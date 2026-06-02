import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { SessionEntity } from '../entities/session.entity';
import { NullableType } from '@/utils/types/nullable.type';

import { SessionRepository } from '../../session.repository';
import { Session } from '@/session/domain/session';
import { RevokeReason } from '@/session/domain/session';

import { SessionMapper } from '../mappers/session.mapper';
import { User } from '@/users/domain/user';

@Injectable()
export class SessionRelationalRepository implements SessionRepository {
  constructor(
    @InjectRepository(SessionEntity)
    private readonly sessionRepository: Repository<SessionEntity>,
  ) {}

  async findById(id: Session['id']): Promise<NullableType<Session>> {
    const entity = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoin('session.user', 'user')
      .addSelect('user.id')
      .where('session.id = :id', { id: Number(id) })
      .getOne();

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: User['id']): Promise<Session[]> {
    const entities = await this.sessionRepository.find({
      where: { user: { id: userId } },
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
    });
    return entities.map((entity) => SessionMapper.toDomain(entity));
  }

  async create(data: Session): Promise<Session> {
    const persistenceModel = SessionMapper.toPersistence(data);
    const entity = await this.sessionRepository.save(
      this.sessionRepository.create(persistenceModel),
    );
    return SessionMapper.toDomain(entity);
  }

  async update(
    id: Session['id'],
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
    >,
  ): Promise<Session | null> {
    const entity = await this.sessionRepository.findOne({
      where: { id: Number(id) },
    });

    if (!entity) {
      throw new Error('Session not found');
    }

    const updatedEntity = await this.sessionRepository.save(
      this.sessionRepository.create(
        SessionMapper.toPersistence({
          ...SessionMapper.toDomain(entity),
          ...payload,
        }),
      ),
    );

    return SessionMapper.toDomain(updatedEntity);
  }

  async updateByHash(
    conditions: { id: Session['id']; hash: Session['hash'] },
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
    >,
  ): Promise<Session | null> {
    const result = await this.sessionRepository.update(
      { id: Number(conditions.id), hash: conditions.hash },
      { hash: payload.hash, lastUsedAt: new Date() },
    );

    if (!result.affected) {
      return null;
    }

    const entity = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoin('session.user', 'user')
      .addSelect('user.id')
      .where('session.id = :id', { id: Number(conditions.id) })
      .getOne();

    return entity ? SessionMapper.toDomain(entity) : null;
  }

  async deleteById(
    id: Session['id'],
    revokeReason?: RevokeReason,
  ): Promise<void> {
    await this.sessionRepository.update(
      { id: Number(id) },
      { revokeAt: new Date(), revokeReason: revokeReason ?? 'logout' },
    );
  }

  async deleteByUserId(
    conditions: { userId: User['id'] },
    revokeReason?: RevokeReason,
  ): Promise<void> {
    await this.sessionRepository.update(
      { user: { id: conditions.userId } },
      { revokeAt: new Date(), revokeReason: revokeReason ?? 'logout' },
    );
  }

  async deleteByUserIdWithExclude(
    conditions: {
      userId: User['id'];
      excludeSessionId: Session['id'];
    },
    revokeReason?: RevokeReason,
  ): Promise<void> {
    await this.sessionRepository.update(
      {
        user: { id: conditions.userId },
        id: Not(Number(conditions.excludeSessionId)),
      },
      { revokeAt: new Date(), revokeReason: revokeReason ?? 'logout' },
    );
  }

  async enforceSessionLimit(
    userId: User['id'],
    maxSessions: number,
  ): Promise<void> {
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .select('session.id')
      .where('"session"."userId" = :userId', { userId })
      .orderBy('session.createdAt', 'ASC')
      .getMany();
    if (sessions.length >= maxSessions) {
      const excess = sessions.slice(0, sessions.length - maxSessions + 1);
      await this.sessionRepository.update(
        { id: In(excess.map((s) => s.id)) },
        { revokeAt: new Date(), revokeReason: 'limit_exceeded' },
      );
    }
  }
}
