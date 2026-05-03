import { ApiProperty } from '@nestjs/swagger';
import { Allow } from 'class-validator';

export class FileType {
  @Allow()
  @ApiProperty({ type: String })
  id: string;

  @Allow()
  @ApiProperty({ type: String })
  path: string;
}
