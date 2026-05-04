import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import type { PermissionEnum } from '../permissions.enum';

export class Permission {
  @Allow()
  @ApiProperty({ type: String, example: 'create:task' })
  name!: PermissionEnum;
}
