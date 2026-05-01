import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { RoleEnum } from '../roles.enum';

export class Role {
  @Allow()
  @ApiProperty({ enum: RoleEnum })
  id!: RoleEnum;

  @Allow()
  @ApiProperty({ type: String, example: 'admin' })
  name?: string;
}
