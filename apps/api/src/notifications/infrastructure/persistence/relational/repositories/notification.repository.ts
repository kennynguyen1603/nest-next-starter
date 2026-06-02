import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { NotificationRepository } from '../../notification.repository';
import { Notification } from '@/notifications/domain/notification';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationMapper } from '../mappers/notification.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';

@Injectable()
export class NotificationsRelationalRepository implements NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {}

  async create(
    data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Notification> {
    const entity = this.repo.create(
      NotificationMapper.toPersistence(data as Notification),
    );
    const saved = await this.repo.save(entity);
    return NotificationMapper.toDomain(saved);
  }

  async bulkCreate(
    notifications: Array<Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Notification[]> {
    if (!notifications.length) return [];
    const now = new Date();
    const rows = notifications.map((n) => ({
      id: uuidv7(),
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data ?? null,
      isRead: n.isRead,
      readAt: n.readAt ?? null,
      createdAt: now,
      updatedAt: now,
    }));
    await this.repo
      .createQueryBuilder()
      .insert()
      .into(NotificationEntity)
      .values(rows as any[])
      .execute();
    return rows.map((row) =>
      NotificationMapper.toDomain(row as unknown as NotificationEntity),
    );
  }

  async findManyByUserId(
    userId: string,
    paginationOptions: IPaginationOptions,
    isRead?: boolean,
  ): Promise<[Notification[], number]> {
    const where: { userId: string; isRead?: boolean } = { userId };
    if (isRead !== undefined) where.isRead = isRead;
    const [entities, total] = await this.repo.findAndCount({
      where,
      skip: (paginationOptions.page - 1) * paginationOptions.limit,
      take: paginationOptions.limit,
      order: { createdAt: 'DESC' },
    });
    return [
      entities.map((entity) => NotificationMapper.toDomain(entity)),
      total,
    ];
  }

  async findById(id: string): Promise<NullableType<Notification>> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? NotificationMapper.toDomain(entity) : null;
  }

  async markAsRead(id: string): Promise<void> {
    await this.repo.update(id, { isRead: true, readAt: new Date() });
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async countUnread(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.repo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async removeAll(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
