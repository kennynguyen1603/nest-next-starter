import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CursorPaginationDto } from './cursor-pagination.dto';

export class CursorPaginatedDto<TData> {
  @ApiProperty({ type: [Object], isArray: true })
  @Expose()
  data: TData[];

  @ApiProperty()
  @Expose()
  pagination: CursorPaginationDto;

  constructor(data: TData[], meta: CursorPaginationDto) {
    this.data = data;
    this.pagination = meta;
  }
}
