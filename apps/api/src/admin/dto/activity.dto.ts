import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ActivityDto {
  @ApiProperty() id: string;
  @ApiProperty() userName: string;
  @ApiPropertyOptional() userAvatar?: string;
  @ApiProperty() action: string;
  @ApiProperty() target: string;
  @ApiProperty() createdAt: string;
}
