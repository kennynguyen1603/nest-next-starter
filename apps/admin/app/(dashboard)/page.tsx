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
              className="bg-background border border-border p-5 h-28 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2">Overview</h1>
        <p className="mt-1 text-small text-muted">
          Key metrics and the latest activity across your users.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
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

      <section className="bg-background border border-border">
        <h2 className="text-label uppercase text-muted px-5 py-4 border-b border-border">
          Recent Activity
        </h2>
        <RecentActivity items={activity} />
      </section>
    </div>
  );
}
