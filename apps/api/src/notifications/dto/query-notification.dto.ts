import {
  BooleanFieldOptional,
  NumberFieldOptional,
} from '@/decorators/field.decorators';
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from '@/constants/app.constant';

export class QueryNotificationDto {
  @NumberFieldOptional({
    minimum: 1,
    maximum: MAX_PAGE_LIMIT,
    min: 1,
    max: MAX_PAGE_LIMIT,
    default: DEFAULT_PAGE_LIMIT,
    int: true,
  })
  readonly limit?: number = DEFAULT_PAGE_LIMIT;

  @NumberFieldOptional({
    minimum: 1,
    min: 1,
    default: DEFAULT_CURRENT_PAGE,
    int: true,
  })
  readonly page?: number = DEFAULT_CURRENT_PAGE;

  @BooleanFieldOptional()
  readonly isRead?: boolean;
}
