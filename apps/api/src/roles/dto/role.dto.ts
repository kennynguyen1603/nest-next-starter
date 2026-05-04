import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoleEnum } from '../roles.enum';

export class RoleDto {
  @ApiProperty({ enum: RoleEnum })
  @IsEnum(RoleEnum)
  name!: RoleEnum;
}
