import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { NotificationRepository } from './infrastructure/persistence/notification.repository';
import { Notification } from './domain/notification';
import { NotificationType } from './notifications.enum';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/offset-pagination.dto';
import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepo: NotificationRepository,
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
    const pageOptions = new PageOptionsDto();
    (pageOptions as any).limit = paginationOptions.limit;
    (pageOptions as any).page = paginationOptions.page;
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
    const updated = await this.notificationRepo.markAsRead(id);
    return updated!;
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepo.findById(id);
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }
    await this.notificationRepo.remove(id);
  }

  async countUnread(userId: string): Promise<number> {
    return this.notificationRepo.countUnread(userId);
  }
}
