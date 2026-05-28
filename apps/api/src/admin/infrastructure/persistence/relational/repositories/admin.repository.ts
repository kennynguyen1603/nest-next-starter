import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { UserEntity } from '@/users/infrastructure/persistence/relational/entities/user.entity';
import { UserStatus } from '@/users/user-status.enum';
import { AdminRepository } from '../../admin.repository';
import { AdminStatsDto } from '@/admin/dto/admin-stats.dto';
import { ActivityDto } from '@/admin/dto/activity.dto';
import { UserGrowthDto } from '@/admin/dto/user-growth.dto';
import { UserSummaryReportDto } from '@/admin/dto/user-summary-report.dto';

@Injectable()
export class AdminRelationalRepository implements AdminRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getStats(): Promise<AdminStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, newUsersToday, activeUsers, usersThirtyDaysAgo] =
      await Promise.all([
        this.userRepo.count({ where: { deletedAt: IsNull() } }),
        this.userRepo
          .createQueryBuilder('u')
          .where('u.deletedAt IS NULL')
          .andWhere('u.createdAt >= :today', { today })
          .getCount(),
        this.userRepo.count({
          where: { deletedAt: IsNull(), status: UserStatus.ACTIVE },
        }),
        this.userRepo
          .createQueryBuilder('u')
          .where('u.deletedAt IS NULL')
          .andWhere('u.createdAt < :thirtyDaysAgo', { thirtyDaysAgo })
          .getCount(),
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
    const users = await this.userRepo.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return users.map((u) => ({
      id: u.id,
      userName:
        [u.firstName, u.lastName].filter(Boolean).join(' ') ||
        u.email ||
        'Unknown',
      action: 'registered',
      target: 'account',
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async getUserStatusSummary(): Promise<UserSummaryReportDto> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUsers, usersThirtyDaysAgo] = await Promise.all([
      this.userRepo.count({ where: { deletedAt: IsNull() } }),
      this.userRepo.count({
        where: { deletedAt: IsNull(), status: UserStatus.ACTIVE },
      }),
      this.userRepo
        .createQueryBuilder('u')
        .where('u.deletedAt IS NULL')
        .andWhere('u.createdAt < :thirtyDaysAgo', { thirtyDaysAgo })
        .getCount(),
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

    const dbType = this.dataSource.options.type;

    let dateExpr: string;
    if (dbType === 'postgres' || dbType === 'cockroachdb') {
      dateExpr = `TO_CHAR(DATE_TRUNC('day', u."createdAt"), 'YYYY-MM-DD')`;
    } else if (dbType === 'sqlite' || dbType === 'better-sqlite3') {
      dateExpr = `strftime('%Y-%m-%d', u."createdAt")`;
    } else {
      // mysql / mariadb
      dateExpr = `DATE_FORMAT(u.createdAt, '%Y-%m-%d')`;
    }

    const rows: Array<{ date: string; count: string }> = await this.dataSource
      .createQueryBuilder()
      .select(dateExpr, 'date')
      .addSelect('COUNT(*)', 'count')
      .from(UserEntity, 'u')
      .where('u.deletedAt IS NULL')
      .andWhere('u.createdAt >= :from', { from })
      .groupBy(dateExpr)
      .orderBy(dateExpr, 'ASC')
      .getRawMany();

    return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
  }
}
