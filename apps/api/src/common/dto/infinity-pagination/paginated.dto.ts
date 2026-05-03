import { ApiProperty } from '@nestjs/swagger';
import { Type } from '@nestjs/common';

export class InfinityPaginationResponseDto<T> {
  data!: T[];
  hasNextPage!: boolean;
}

export function InfinityPaginationResponse<T>(classRef: Type<T>) {
  abstract class InfinityPaginationResponseClass {
    @ApiProperty({ type: [classRef] })
    data!: T[];

    @ApiProperty({ type: Boolean })
    hasNextPage!: boolean;
  }

  Object.defineProperty(InfinityPaginationResponseClass, 'name', {
    writable: false,
    value: `InfinityPagination${classRef.name}ResponseDto`,
  });

  return InfinityPaginationResponseClass;
}
