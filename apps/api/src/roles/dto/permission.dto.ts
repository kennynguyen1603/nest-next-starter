import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Permission } from '../permissions.enum';
import type { PermissionEnum } from '../permissions.enum';

export class PermissionDto {
  @ApiProperty({ enum: Object.values(Permission) })
  @IsIn(Object.values(Permission))
  name!: PermissionEnum;
}
