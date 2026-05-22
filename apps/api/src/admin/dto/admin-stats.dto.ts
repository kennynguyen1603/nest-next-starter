import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsDto {
  @ApiProperty() totalUsers: number;
  @ApiProperty() newUsersToday: number;
  @ApiProperty() totalRevenue: number;
  @ApiProperty() activeOrders: number;
  @ApiProperty() userGrowthPercent: number;
}
