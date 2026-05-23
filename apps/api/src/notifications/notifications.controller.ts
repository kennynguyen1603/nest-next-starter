import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ApiAuth } from '@/decorators/http.decorators';
import { JwtPayloadType } from '@/auth/strategies/types/jwt-payload.type';
import { Notification } from './domain/notification';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';

@ApiTags('Notifications')
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiAuth({
    type: Notification,
    summary: 'List my notifications',
    isPaginated: true,
  })
  findAll(
    @Request() request: { user: JwtPayloadType },
    @Query() query: QueryNotificationDto,
  ): Promise<OffsetPaginatedDto<Notification>> {
    return this.notificationsService.findAll(
      request.user.id,
      { page: query.page ?? 1, limit: query.limit ?? 10 },
      query.isRead,
    );
  }

  @Patch(':id/read')
  @ApiAuth({ type: Notification, summary: 'Mark notification as read' })
  markAsRead(
    @Param('id') id: string,
    @Request() request: { user: JwtPayloadType },
  ): Promise<Notification> {
    return this.notificationsService.markAsRead(id, request.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiAuth({
    summary: 'Delete a notification',
    statusCode: HttpStatus.NO_CONTENT,
    errorResponses: [HttpStatus.NOT_FOUND],
  })
  async remove(
    @Param('id') id: string,
    @Request() request: { user: JwtPayloadType },
  ): Promise<void> {
    await this.notificationsService.remove(id, request.user.id);
  }
}
