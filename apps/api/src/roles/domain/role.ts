import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { RoleEnum } from '../roles.enum';

export class Role {
  @Allow()
  @ApiProperty({ type: String })
  id?: string;

  @Allow()
  @ApiProperty({ enum: RoleEnum, example: RoleEnum.USER })
  name!: RoleEnum;
}
