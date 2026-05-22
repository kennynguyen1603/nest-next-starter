import { ApiProperty } from '@nestjs/swagger';

export class UserGrowthDto {
  @ApiProperty() date: string;
  @ApiProperty() count: number;
}
