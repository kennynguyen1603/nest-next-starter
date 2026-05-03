import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DEFAULT_PAGE_LIMIT } from '@/constants/app.constant';
import { PageOptionsDto } from './page-options.dto';

export class CursorPaginationDto {
  @ApiProperty()
  @Expose()
  readonly limit: number;

  @ApiProperty()
  @Expose()
  readonly afterCursor?: string;

  @ApiProperty()
  @Expose()
  readonly beforeCursor?: string;

  @ApiProperty()
  @Expose()
  readonly totalRecords: number;

  constructor(
    totalRecords: number,
    afterCursor: string,
    beforeCursor: string,
    pageOptions: PageOptionsDto,
  ) {
    this.limit = pageOptions?.limit ?? DEFAULT_PAGE_LIMIT;
    this.afterCursor = afterCursor;
    this.beforeCursor = beforeCursor;
    this.totalRecords = totalRecords;
  }
}
