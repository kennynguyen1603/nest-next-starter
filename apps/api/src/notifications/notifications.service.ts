import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotificationRepository } from './infrastructure/persistence/notification.repository';
import { Notification } from './domain/notification';
import { NotificationType } from './notifications.enum';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/offset-pagination.dto';
import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { SocketService } from '@/socket/socket.service';
import { SocketEvent } from '@/socket/types/socket-event.enum';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepo: NotificationRepository,
    @Optional()
    @Inject(SocketService)
    private readonly socketService: SocketService | null,
    @InjectPinoLogger(NotificationsService.name)
    private readonly logger: PinoLogger,
  ) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    const notification = await this.notificationRepo.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data ?? null,
      isRead: false,
      readAt: null,
    });
    this.socketService?.emitToUser(
      data.userId,
      SocketEvent.NotificationNew,
      notification,
    );
    this.logger.info(
      { id: notification.id, userId: data.userId },
      'Notification created',
    );
    return notification;
  }

  async findAll(
    userId: string,
    paginationOptions: IPaginationOptions,
    isRead?: boolean,
  ): Promise<OffsetPaginatedDto<Notification>> {
    const [notifications, total] = await this.notificationRepo.findManyByUserId(
      userId,
      paginationOptions,
      isRead,
    );
    const pageOptions = Object.assign(new PageOptionsDto(), {
      limit: paginationOptions.limit,
      page: paginationOptions.page,
    });
    return new OffsetPaginatedDto(
      notifications,
      new OffsetPaginationDto(total, pageOptions),
    );
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const existing = await this.notificationRepo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.notificationRepo.markAsRead(id);
    // Mutate and return the already-fetched entity — avoids a second SELECT
    existing.isRead = true;
    existing.readAt = new Date();
    return existing;
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.notificationRepo.remove(id);
  }

  async broadcastToUsers(
    userIds: string[],
    data: {
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, unknown>;
    },
  ): Promise<{ count: number }> {
    // Chunk the bulk INSERT: a single VALUES list over every user would blow
    // past the DB bind-parameter limit (Postgres ~65535 params) once the user
    // base grows. Each chunk is still one INSERT.
    const CHUNK_SIZE = 1000;
    let count = 0;
    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + CHUNK_SIZE);
      const notifications = await this.notificationRepo.bulkCreate(
        chunk.map((userId) => ({
          userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: data.data ?? null,
          isRead: false,
          readAt: null,
        })),
      );

      notifications.forEach((notif) => {
        this.socketService?.emitToUser(
          notif.userId,
          SocketEvent.NotificationNew,
          notif,
        );
      });
      count += chunk.length;
    }

    this.logger.info(
      { count, title: data.title },
      'Broadcast notification sent',
    );
    return { count };
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepo.countUnread(userId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.markAllAsRead(userId);
  }

  async removeAll(userId: string): Promise<void> {
    await this.notificationRepo.removeAll(userId);
  }
}
