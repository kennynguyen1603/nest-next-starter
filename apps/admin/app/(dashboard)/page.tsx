"use client";

import { useEffect, useState } from "react";
import { Users, UserPlus, UserCheck, UserX } from "lucide-react";
import { api, tryRefresh } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import StatsCard from "@/components/dashboard/StatsCard";
import RecentActivity from "@/components/dashboard/RecentActivity";
import type { AdminStats, AdminActivity } from "@repo/types";

export default function DashboardPage() {
  const { accessToken } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!accessToken) {
        await tryRefresh();
      }
      try {
        const [s, a] = await Promise.all([
          api.get<AdminStats>("/api/v1/admin/stats"),
          api.get<AdminActivity[]>("/api/v1/admin/recent-activity"),
        ]);
        setStats(s);
        setActivity(a);
      } catch {
        // 401 is handled by api.ts (redirects to /login)
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          trend={stats?.userGrowthPercent}
        />
        <StatsCard
          label="New Today"
          value={stats?.newUsersToday ?? 0}
          icon={UserPlus}
        />
        <StatsCard
          label="Active Users"
          value={stats?.activeUsers ?? 0}
          icon={UserCheck}
        />
        <StatsCard
          label="Inactive Users"
          value={stats?.inactiveUsers ?? 0}
          icon={UserX}
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        <RecentActivity items={activity} />
      </div>
    </div>
  );
}
