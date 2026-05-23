import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';
import { OffsetPaginationDto } from '@/common/dto/offset-pagination/offset-pagination.dto';
import { Notification } from './domain/notification';
import { NotificationType } from './notifications.enum';

function makeNotification(): Notification {
  const n = new Notification();
  n.id = 'notif-id';
  n.userId = 'user-id';
  n.type = NotificationType.SYSTEM;
  n.title = 'Test';
  n.message = 'Body';
  n.data = null;
  n.isRead = false;
  n.readAt = null;
  n.createdAt = new Date();
  n.updatedAt = new Date();
  return n;
}

const mockService = {
  findAll: jest.fn(),
  markAsRead: jest.fn(),
  remove: jest.fn(),
  countUnread: jest.fn(),
};

const jwtUser = {
  id: 'user-id',
} as JwtPayloadType;

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();
    controller = module.get(NotificationsController);
  });

  it('findAll delegates to service with userId from JWT', async () => {
    const paginated = new OffsetPaginatedDto<Notification>(
      [makeNotification()],
      new OffsetPaginationDto(1, { limit: 10, page: 1 } as any),
    );
    mockService.findAll.mockResolvedValue(paginated);
    const result = await controller.findAll(
      { user: jwtUser },
      { page: 1, limit: 10 },
    );
    expect(mockService.findAll).toHaveBeenCalledWith(
      'user-id',
      { page: 1, limit: 10 },
      undefined,
    );
    expect(result.data).toHaveLength(1);
  });

  it('markAsRead delegates to service', async () => {
    const updated = makeNotification();
    updated.isRead = true;
    mockService.markAsRead.mockResolvedValue(updated);
    const result = await controller.markAsRead('notif-id', { user: jwtUser });
    expect(mockService.markAsRead).toHaveBeenCalledWith('notif-id', 'user-id');
    expect(result.isRead).toBe(true);
  });

  it('remove delegates to service', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await controller.remove('notif-id', { user: jwtUser });
    expect(mockService.remove).toHaveBeenCalledWith('notif-id', 'user-id');
  });
});
