import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';
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

export function OffsetPaginationResponse<T>(classRef: Type<T>) {
  abstract class OffsetPaginationResponseClass {
    @ApiProperty({ type: [classRef] })
    data!: T[];

    @ApiProperty({ type: OffsetPaginationDto })
    pagination!: OffsetPaginationDto;
  }

  Object.defineProperty(OffsetPaginationResponseClass, 'name', {
    writable: false,
    value: `Offset${classRef.name}PaginationResponseDto`,
  });

  return OffsetPaginationResponseClass;
}
