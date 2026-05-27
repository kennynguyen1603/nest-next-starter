import { AdminStatsDto } from '../../dto/admin-stats.dto';
import { ActivityDto } from '../../dto/activity.dto';
import { UserGrowthDto } from '../../dto/user-growth.dto';
import { UserSummaryReportDto } from '../../dto/user-summary-report.dto';

export abstract class AdminRepository {
  abstract getStats(): Promise<AdminStatsDto>;
  abstract getRecentActivity(): Promise<ActivityDto[]>;
  abstract getUserStatusSummary(): Promise<UserSummaryReportDto>;
  abstract getUserGrowth(): Promise<UserGrowthDto[]>;
}
