import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class Permission {
  @Allow()
  @ApiProperty({ type: Number })
  id!: number;

  @Allow()
  @ApiProperty({ type: String, example: 'task.create' })
  name!: string;
}
