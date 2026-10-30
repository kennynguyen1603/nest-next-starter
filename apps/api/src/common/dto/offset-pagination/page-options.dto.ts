import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
  Order,
} from '@/constants/app.constant';
import {
  NumberFieldOptional,
  StringFieldOptional,
  EnumFieldOptional,
} from '@/decorators/field.decorators';

export class PageOptionsDto {
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

  @StringFieldOptional()
  readonly q?: string;

  @EnumFieldOptional(() => Order, { default: Order.Asc })
  readonly order?: Order = Order.Asc;

  get offset() {
    return (
      ((this.page ?? DEFAULT_CURRENT_PAGE) - 1) *
      (this.limit ?? DEFAULT_PAGE_LIMIT)
    );
  }
}
