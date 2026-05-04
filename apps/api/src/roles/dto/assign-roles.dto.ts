import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoleEnum } from '../roles.enum';

export class AssignRolesDto {
  @ApiProperty({ enum: RoleEnum, isArray: true })
  @IsEnum(RoleEnum, { each: true })
  roles!: RoleEnum[];
}
