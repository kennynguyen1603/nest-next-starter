import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';

import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { RoleDto } from '@/roles/dto/role.dto';
import { User } from '../domain/user';

export class FilterUserDto {
  @ApiPropertyOptional({ type: RoleDto })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles?: RoleDto[] | null;
}

export class SortUserDto {
  @ApiProperty()
  @Type(() => String)
  @IsString()
  orderBy!: keyof User;

  @ApiProperty()
  @IsString()
  order!: string;
}

export class QueryUserDto extends PageOptionsDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(FilterUserDto, JSON.parse(value as string))
      : undefined,
  )
  @ValidateNested()
  @Type(() => FilterUserDto)
  filters?: FilterUserDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    value
      ? plainToInstance(SortUserDto, JSON.parse(value as string))
      : undefined,
  )
  @ValidateNested({ each: true })
  @Type(() => SortUserDto)
  sort?: SortUserDto[] | null;
}
