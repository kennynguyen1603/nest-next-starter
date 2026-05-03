import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT,
} from '@/constants/app.constant';
import { PageOptionsDto } from './page-options.dto';

export class OffsetPaginationDto {
  @ApiProperty()
  @Expose()
  readonly limit: number;

  @ApiProperty()
  @Expose()
  readonly currentPage: number;

  @ApiProperty()
  @Expose()
  readonly nextPage?: number;

  @ApiProperty()
  @Expose()
  readonly previousPage?: number;

  @ApiProperty()
  @Expose()
  readonly totalRecords: number;

  @ApiProperty()
  @Expose()
  readonly totalPages: number;

  constructor(totalRecords: number, pageOptions: PageOptionsDto) {
    this.limit = pageOptions?.limit ?? DEFAULT_PAGE_LIMIT;
    this.currentPage = pageOptions?.page ?? DEFAULT_CURRENT_PAGE;
    this.totalRecords = totalRecords;
    this.totalPages = this.limit > 0 ? Math.ceil(totalRecords / this.limit) : 0;
    this.nextPage =
      this.currentPage < this.totalPages ? this.currentPage + 1 : undefined;
    this.previousPage =
      this.currentPage > 1 && this.currentPage - 1 < this.totalPages
        ? this.currentPage - 1
        : undefined;
  }
}
