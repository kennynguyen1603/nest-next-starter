import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSchemaClass } from '@/users/infrastructure/persistence/document/entities/user.schema';
import { UserStatus } from '@/users/user-status.enum';
import { AdminRepository } from '../../admin.repository';
import { AdminStatsDto } from '@/admin/dto/admin-stats.dto';
import { ActivityDto } from '@/admin/dto/activity.dto';
import { UserGrowthDto } from '@/admin/dto/user-growth.dto';
import { UserSummaryReportDto } from '@/admin/dto/user-summary-report.dto';

@Injectable()
export class AdminDocumentRepository implements AdminRepository {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly userModel: Model<UserSchemaClass>,
  ) {}

  // All user counters in one collection pass instead of one count per metric.
  private async countUsers() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [row] = await this.userModel.aggregate<{
      totalUsers: number;
      newUsersToday: number;
      activeUsers: number;
      usersThirtyDaysAgo: number;
    }>([
      { $match: { deletedAt: { $exists: false } } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          newUsersToday: {
            $sum: { $cond: [{ $gte: ['$createdAt', today] }, 1, 0] },
          },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$status', UserStatus.ACTIVE] }, 1, 0] },
          },
          usersThirtyDaysAgo: {
            $sum: { $cond: [{ $lt: ['$createdAt', thirtyDaysAgo] }, 1, 0] },
          },
        },
      },
    ]);
    return (
      row ?? {
        totalUsers: 0,
        newUsersToday: 0,
        activeUsers: 0,
        usersThirtyDaysAgo: 0,
      }
    );
  }

  async getStats(): Promise<AdminStatsDto> {
    const { totalUsers, newUsersToday, activeUsers, usersThirtyDaysAgo } =
      await this.countUsers();

    const inactiveUsers = totalUsers - activeUsers;
    const userGrowthPercent =
      usersThirtyDaysAgo > 0
        ? Math.round(
            ((totalUsers - usersThirtyDaysAgo) / usersThirtyDaysAgo) * 100,
          )
        : 0;

    return {
      totalUsers,
      newUsersToday,
      activeUsers,
      inactiveUsers,
      userGrowthPercent,
    };
  }

  async getRecentActivity(): Promise<ActivityDto[]> {
    const users = await this.userModel
      .find({ deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email createdAt')
      .lean();

    return users.map((u) => ({
      id: String(u._id),
      userName:
        [u.firstName, u.lastName].filter(Boolean).join(' ') ||
        u.email ||
        'Unknown',
      action: 'registered',
      target: 'account',
      createdAt: (u.createdAt as Date).toISOString(),
    }));
  }

  async getUserStatusSummary(): Promise<UserSummaryReportDto> {
    const { totalUsers, activeUsers, usersThirtyDaysAgo } =
      await this.countUsers();

    const inactiveUsers = totalUsers - activeUsers;
    const userGrowthPercent =
      usersThirtyDaysAgo > 0
        ? Math.round(
            ((totalUsers - usersThirtyDaysAgo) / usersThirtyDaysAgo) * 100,
          )
        : 0;

    return { totalUsers, activeUsers, inactiveUsers, userGrowthPercent };
  }

  async getUserGrowth(): Promise<UserGrowthDto[]> {
    // Rows are grouped by UTC day, so start the window at UTC midnight.
    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - 30);

    const rows = await this.userModel.aggregate<{
      _id: { year: number; month: number; day: number };
      count: number;
    }>([
      { $match: { createdAt: { $gte: from }, deletedAt: { $exists: false } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    return rows.map((r) => {
      const d = new Date(Date.UTC(r._id.year, r._id.month - 1, r._id.day));
      return {
        date: d.toISOString().split('T')[0] as string,
        count: r.count,
      };
    });
  }
}
