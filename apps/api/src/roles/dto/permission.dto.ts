import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { PermissionEnum } from '../permissions.enum';

export class PermissionDto {
  @ApiProperty({ enum: PermissionEnum })
  @IsEnum(PermissionEnum)
  id!: PermissionEnum;
}
