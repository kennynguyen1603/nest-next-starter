import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadRequestException } from '@nestjs/common';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';

import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { RoleDto } from '@/roles/dto/role.dto';
import { User } from '../domain/user';

// orderBy is interpolated into the ORM sort clause, so only plain, non-secret
// columns may be sorted on (never password/socialId, never relations).
export const SORTABLE_USER_FIELDS = [
  'id',
  'email',
  'firstName',
  'lastName',
  'status',
  'createdAt',
  'updatedAt',
] as const satisfies readonly (keyof User)[];

export const SORT_ORDERS = ['ASC', 'DESC'] as const;

function parseJsonQuery(value: unknown, name: string): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new BadRequestException(`${name} must be valid JSON`);
  }
}

export class FilterUserDto {
  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles?: RoleDto[] | null;
}

export class SortUserDto {
  @ApiProperty({ enum: SORTABLE_USER_FIELDS })
  @Type(() => String)
  @IsIn(SORTABLE_USER_FIELDS)
  orderBy!: (typeof SORTABLE_USER_FIELDS)[number];

  @ApiProperty({ enum: SORT_ORDERS })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsString()
  @IsIn(SORT_ORDERS)
  order!: (typeof SORT_ORDERS)[number];
}

export class QueryUserDto extends PageOptionsDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(FilterUserDto, parseJsonQuery(value, 'filters'))
      : undefined,
  )
  @ValidateNested()
  @Type(() => FilterUserDto)
  filters?: FilterUserDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(SortUserDto, parseJsonQuery(value, 'sort'))
      : undefined,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortUserDto)
  sort?: SortUserDto[] | null;
}
