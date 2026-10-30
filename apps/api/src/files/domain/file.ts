import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Allow } from 'class-validator';

export class FileType {
  @Allow()
  @ApiProperty({ type: String })
  id!: string;

  @Allow()
  @ApiProperty({ type: String })
  path!: string;

  @ApiHideProperty()
  @Exclude({ toPlainOnly: true })
  ownerId?: string | null;
}
