import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { OffsetPaginationDto } from './offset-pagination.dto';

export class OffsetPaginatedDto<TData> {
  @ApiProperty({ type: [Object], isArray: true })
  @Expose()
  data: TData[];

  @ApiProperty({ type: OffsetPaginationDto })
  @Expose()
  pagination: OffsetPaginationDto;

  constructor(data: TData[], meta: OffsetPaginationDto) {
    this.data = data;
    this.pagination = meta;
  }
}
