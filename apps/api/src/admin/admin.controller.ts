import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '@/decorators/roles.decorator';
import { RoleEnum } from '@/roles/roles.enum';
import { RbacGuard } from '@/roles/rbac.guard';
import { AdminService } from './admin.service';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { ActivityDto } from './dto/activity.dto';
import { UserGrowthDto } from './dto/user-growth.dto';
import { UserSummaryReportDto } from './dto/user-summary-report.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(RoleEnum.ADMIN)
@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiOkResponse({ type: AdminStatsDto })
  @Get('stats')
  getStats(): Promise<AdminStatsDto> {
    return this.adminService.getStats();
  }

  @ApiOkResponse({ type: [ActivityDto] })
  @Get('recent-activity')
  getRecentActivity(): Promise<ActivityDto[]> {
    return this.adminService.getRecentActivity();
  }

  @ApiOkResponse({ type: [UserGrowthDto] })
  @Get('charts/users-growth')
  getUserGrowth(): Promise<UserGrowthDto[]> {
    return this.adminService.getUserGrowth();
  }

  @ApiOkResponse({ type: UserSummaryReportDto })
  @Get('reports/user-summary')
  getUserStatusSummary(): Promise<UserSummaryReportDto> {
    return this.adminService.getUserStatusSummary();
  }
}
