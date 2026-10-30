"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { api, tryRefresh } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { UserGrowthPoint } from "@repo/types";

// Chart sits below the summary cards — split it out of the initial bundle.
const LineChart = dynamic(() => import("@/components/reports/LineChart"), {
  loading: () => <div className="h-48 animate-pulse bg-surface" />,
});

interface UserSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  userGrowthPercent: number;
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label uppercase text-muted">{label}</span>
        <Icon size={16} aria-hidden="true" className="text-muted" />
      </div>
      <p className="text-h1 tabular-nums">{value}</p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { accessToken } = useAuthStore();
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [growth, setGrowth] = useState<UserGrowthPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!accessToken) await tryRefresh();
      try {
        const [s, g] = await Promise.all([
          api.get<UserSummary>("/api/v1/admin/reports/user-summary"),
          api.get<UserGrowthPoint[]>("/api/v1/admin/charts/users-growth"),
        ]);
        setSummary(s);
        setGrowth(g);
      } catch {
        // 401 handled by api.ts
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="border border-border bg-background h-72 animate-pulse" />
      </div>
    );
  }

  const totalNewInPeriod = growth.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h2">Reports</h1>
        <p className="mt-1 text-small text-muted">
          User totals and registrations over the last 30 days.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
        <SummaryCard
          label="Total Users"
          value={summary?.totalUsers ?? 0}
          icon={Users}
        />
        <SummaryCard
          label="Active Users"
          value={summary?.activeUsers ?? 0}
          icon={UserCheck}
        />
        <SummaryCard
          label="Inactive Users"
          value={summary?.inactiveUsers ?? 0}
          icon={UserX}
        />
        <SummaryCard
          label="Growth (30d)"
          value={`${summary?.userGrowthPercent ?? 0}%`}
          icon={TrendingUp}
        />
      </div>

      {/* Growth chart */}
      <section className="border border-border bg-background p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-label uppercase text-muted">
            User Growth — Last 30 days
          </h2>
          <span className="text-caption text-muted">
            {totalNewInPeriod} new registrations
          </span>
        </div>
        <LineChart data={growth} />
      </section>

      {/* Daily registrations table */}
      <section className="border border-border bg-background">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-label uppercase text-muted">
            Daily Registrations
          </h2>
        </div>
        {growth.length === 0 ? (
          <p className="px-5 py-10 text-small text-muted text-center">
            No registration data in the last 30 days.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-5 py-3 text-left text-label uppercase text-muted">
                    Date
                  </th>
                  <th className="px-5 py-3 text-right text-label uppercase text-muted">
                    New Users
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...growth].reverse().map((row) => (
                  <tr
                    key={row.date}
                    className="hover:bg-surface transition-colors"
                  >
                    <td className="px-5 py-3 text-muted font-mono text-caption">
                      {row.date}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
