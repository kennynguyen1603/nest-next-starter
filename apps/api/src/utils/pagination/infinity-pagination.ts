import { InfinityPaginationResponseDto } from '@/common/dto/infinity-pagination/paginated.dto';
import { IPaginationOptions } from '@/utils/types/pagination-options';

export const infinityPagination = <T>(
  data: T[],
  options: IPaginationOptions,
): InfinityPaginationResponseDto<T> => {
  return {
    data,
    hasNextPage: data.length === options.limit,
  };
};
