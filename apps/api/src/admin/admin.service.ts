import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserSchemaClass } from '@/users/infrastructure/persistence/document/entities/user.schema';
import { UserStatus } from '@/users/user-status.enum';
import { AdminStatsDto } from './dto/admin-stats.dto';
import { ActivityDto } from './dto/activity.dto';
import { UserGrowthDto } from './dto/user-growth.dto';
import { UserSummaryReportDto } from './dto/user-summary-report.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(UserSchemaClass.name)
    private readonly userModel: Model<UserSchemaClass>,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, newUsersToday, activeUsers, usersThirtyDaysAgo] =
      await Promise.all([
        this.userModel.countDocuments({ deletedAt: { $exists: false } }),
        this.userModel.countDocuments({
          deletedAt: { $exists: false },
          createdAt: { $gte: today },
        }),
        this.userModel.countDocuments({
          deletedAt: { $exists: false },
          status: UserStatus.ACTIVE,
        }),
        this.userModel.countDocuments({
          deletedAt: { $exists: false },
          createdAt: { $lt: thirtyDaysAgo },
        }),
      ]);

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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUsers, usersThirtyDaysAgo] = await Promise.all([
      this.userModel.countDocuments({ deletedAt: { $exists: false } }),
      this.userModel.countDocuments({
        deletedAt: { $exists: false },
        status: UserStatus.ACTIVE,
      }),
      this.userModel.countDocuments({
        deletedAt: { $exists: false },
        createdAt: { $lt: thirtyDaysAgo },
      }),
    ]);

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
    const from = new Date();
    from.setDate(from.getDate() - 30);

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
      const d = new Date(r._id.year, r._id.month - 1, r._id.day);
      return {
        date: d.toISOString().split('T')[0],
        count: r.count,
      };
    });
  }
}
