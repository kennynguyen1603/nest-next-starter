import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationRepository } from '../../notification.repository';
import { Notification } from '@/notifications/domain/notification';
import { NotificationSchemaClass } from '../entities/notification.schema';
import { NotificationDocumentMapper } from '../mappers/notification.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';

@Injectable()
export class NotificationsDocumentRepository implements NotificationRepository {
  constructor(
    @InjectModel(NotificationSchemaClass.name)
    private readonly model: Model<NotificationSchemaClass>,
  ) {}

  async create(
    data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Notification> {
    const created = await this.model.create(data);
    return NotificationDocumentMapper.toDomain(created);
  }

  async findManyByUserId(
    userId: string,
    paginationOptions: IPaginationOptions,
    isRead?: boolean,
  ): Promise<[Notification[], number]> {
    const filter: { userId: string; isRead?: boolean } = { userId };
    if (isRead !== undefined) filter.isRead = isRead;
    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((paginationOptions.page - 1) * paginationOptions.limit)
        .limit(paginationOptions.limit)
        .lean({ virtuals: true }),
      this.model.countDocuments(filter),
    ]);
    return [
      docs.map((d) =>
        NotificationDocumentMapper.toDomain(
          d as unknown as NotificationSchemaClass,
        ),
      ),
      total,
    ];
  }

  async findById(id: string): Promise<NullableType<Notification>> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).lean({ virtuals: true });
    return doc
      ? NotificationDocumentMapper.toDomain(
          doc as unknown as NotificationSchemaClass,
        )
      : null;
  }

  async markAsRead(id: string): Promise<NullableType<Notification>> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model
      .findByIdAndUpdate(
        id,
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .lean({ virtuals: true });
    return doc
      ? NotificationDocumentMapper.toDomain(
          doc as unknown as NotificationSchemaClass,
        )
      : null;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.model.findByIdAndDelete(id);
  }

  async countUnread(userId: string): Promise<number> {
    return this.model.countDocuments({ userId, isRead: false });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.model.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async removeAll(userId: string): Promise<void> {
    await this.model.deleteMany({ userId });
  }
}
