import { ApiProperty } from '@nestjs/swagger';

export class UserSummaryReportDto {
  @ApiProperty() totalUsers: number;
  @ApiProperty() activeUsers: number;
  @ApiProperty() inactiveUsers: number;
  @ApiProperty() userGrowthPercent: number;
}
