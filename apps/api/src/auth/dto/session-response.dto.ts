import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SessionResponseDto {
  @ApiProperty()
  @Expose()
  id!: number | string;

  @ApiProperty({ required: false })
  @Expose()
  deviceId?: string;

  @ApiProperty({ required: false })
  @Expose()
  deviceName?: string;

  @ApiProperty({ required: false })
  @Expose()
  ipAddress?: string;

  @ApiProperty({ required: false })
  @Expose()
  platform?: string;

  @ApiProperty({ required: false })
  @Expose()
  lastUsedAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'True if this is the currently active session' })
  @Expose()
  isCurrent!: boolean;
}
