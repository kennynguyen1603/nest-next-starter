import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { SessionSchemaClass } from '../entities/session.schema';
import { SessionMapper } from '../mappers/session.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import { SessionRepository } from '@/session/infrastructure/persistence/session.repository';
import { Session } from '@/session/domain/session';
import { RevokeReason } from '@/session/domain/session';
import { User } from '@/users/domain/user';

@Injectable()
export class SessionDocumentRepository implements SessionRepository {
  constructor(
    @InjectModel(SessionSchemaClass.name)
    private readonly sessionModel: Model<SessionSchemaClass>,
  ) {}

  async findById(id: Session['id']): Promise<NullableType<Session>> {
    const sessionObject = await this.sessionModel
      .findById(id)
      .lean<SessionSchemaClass>();
    return sessionObject ? SessionMapper.toDomain(sessionObject) : null;
  }

  async findByUserId(userId: User['id']): Promise<Session[]> {
    const sessions = await this.sessionModel
      .find({ user: userId.toString(), revokeAt: { $exists: false } })
      .sort({ lastUsedAt: -1, createdAt: -1 })
      .lean<SessionSchemaClass[]>();
    return sessions.map(SessionMapper.toDomain);
  }

  async create(data: Session): Promise<Session> {
    const persistenceModel = SessionMapper.toPersistence(data);
    const createdSession = new this.sessionModel(persistenceModel);
    const sessionObject = await createdSession.save();
    return SessionMapper.toDomain(sessionObject);
  }

  async updateByHash(
    conditions: { id: Session['id']; hash: Session['hash'] },
    payload: Partial<
      Omit<Session, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
    >,
  ): Promise<Session | null> {
    // A revoked session must never rotate again, even if the old hash matches.
    const sessionObject = await this.sessionModel
      .findOneAndUpdate(
        {
          _id: conditions.id.toString(),
          hash: conditions.hash,
          revokeAt: { $exists: false },
        },
        { $set: { hash: payload.hash, lastUsedAt: new Date() } },
        { returnDocument: 'after' },
      )
      .lean<SessionSchemaClass>();

    return sessionObject ? SessionMapper.toDomain(sessionObject) : null;
  }

  async deleteById(
    id: Session['id'],
    revokeReason?: RevokeReason,
  ): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: id.toString(), revokeAt: { $exists: false } },
      {
        $set: { revokeAt: new Date(), revokeReason: revokeReason ?? 'logout' },
      },
    );
  }

  async deleteByUserId(
    { userId }: { userId: User['id'] },
    revokeReason?: RevokeReason,
  ): Promise<void> {
    await this.sessionModel.updateMany(
      { user: userId.toString(), revokeAt: { $exists: false } },
      {
        $set: { revokeAt: new Date(), revokeReason: revokeReason ?? 'logout' },
      },
    );
  }

  async deleteByUserIdWithExclude(
    {
      userId,
      excludeSessionId,
    }: {
      userId: User['id'];
      excludeSessionId: Session['id'];
    },
    revokeReason?: RevokeReason,
  ): Promise<void> {
    await this.sessionModel.updateMany(
      {
        user: userId.toString(),
        _id: { $ne: excludeSessionId.toString() },
        revokeAt: { $exists: false },
      },
      {
        $set: { revokeAt: new Date(), revokeReason: revokeReason ?? 'logout' },
      },
    );
  }

  async enforceSessionLimit(
    userId: User['id'],
    maxSessions: number,
  ): Promise<void> {
    const sessions = await this.sessionModel
      .find({ user: userId.toString(), revokeAt: { $exists: false } })
      .sort({ createdAt: 1 })
      .select('_id')
      .lean();
    if (sessions.length >= maxSessions) {
      const excess = sessions.slice(0, sessions.length - maxSessions + 1);
      await this.sessionModel.updateMany(
        { _id: { $in: excess.map((s) => s._id) } },
        { $set: { revokeAt: new Date(), revokeReason: 'limit_exceeded' } },
      );
    }
  }
}
