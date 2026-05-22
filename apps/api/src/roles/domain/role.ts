import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { Expose } from 'class-transformer';
import { RoleEnum } from '../roles.enum';

export class Role {
  @Allow()
  @Expose()
  @ApiProperty({ type: String })
  id!: string;

  @Allow()
  @Expose()
  @ApiProperty({ enum: RoleEnum, example: RoleEnum.USER })
  name!: RoleEnum;
}
