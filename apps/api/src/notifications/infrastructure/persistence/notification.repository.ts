import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { Notification } from '../../domain/notification';

export abstract class NotificationRepository {
  abstract create(
    data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Notification>;

  abstract findManyByUserId(
    userId: string,
    paginationOptions: IPaginationOptions,
    isRead?: boolean,
  ): Promise<[Notification[], number]>;

  abstract findById(
    id: Notification['id'],
  ): Promise<NullableType<Notification>>;

  abstract markAsRead(id: Notification['id']): Promise<void>;

  abstract bulkCreate(
    notifications: Array<Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Notification[]>;

  abstract remove(id: Notification['id']): Promise<void>;

  abstract countUnread(userId: string): Promise<number>;

  abstract markAllAsRead(userId: string): Promise<void>;

  abstract removeAll(userId: string): Promise<void>;
}
