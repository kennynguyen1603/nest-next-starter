import { Injectable } from '@nestjs/common';
import { AdminRepository } from './infrastructure/persistence/admin.repository';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { ActivityDto } from './dto/activity.dto';
import { UserGrowthDto } from './dto/user-growth.dto';
import { UserSummaryReportDto } from './dto/user-summary-report.dto';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepo: AdminRepository) {}

  getStats(): Promise<AdminStatsDto> {
    return this.adminRepo.getStats();
  }

  getRecentActivity(): Promise<ActivityDto[]> {
    return this.adminRepo.getRecentActivity();
  }

  getUserStatusSummary(): Promise<UserSummaryReportDto> {
    return this.adminRepo.getUserStatusSummary();
  }

  getUserGrowth(): Promise<UserGrowthDto[]> {
    return this.adminRepo.getUserGrowth();
  }
}
