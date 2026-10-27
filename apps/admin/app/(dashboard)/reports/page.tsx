"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { api, tryRefresh } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { UserGrowthPoint } from "@repo/types";

// Chart sits below the summary cards — split it out of the initial bundle.
const LineChart = dynamic(() => import("@/components/reports/LineChart"), {
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-gray-50" />,
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
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-5 h-24 animate-pulse"
            />
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 h-64 animate-pulse" />
      </div>
    );
  }

  const totalNewInPeriod = growth.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Reports</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Users"
          value={summary?.totalUsers ?? 0}
          icon={Users}
          color="bg-indigo-500"
        />
        <SummaryCard
          label="Active Users"
          value={summary?.activeUsers ?? 0}
          icon={UserCheck}
          color="bg-green-500"
        />
        <SummaryCard
          label="Inactive Users"
          value={summary?.inactiveUsers ?? 0}
          icon={UserX}
          color="bg-gray-400"
        />
        <SummaryCard
          label="Growth (30d)"
          value={`${summary?.userGrowthPercent ?? 0}%`}
          icon={TrendingUp}
          color="bg-violet-500"
        />
      </div>

      {/* Growth chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">
            User Growth — Last 30 days
          </h2>
          <span className="text-xs text-gray-400">
            {totalNewInPeriod} new registrations
          </span>
        </div>
        <LineChart data={growth} />
      </div>

      {/* Daily registrations table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">
            Daily Registrations
          </h2>
        </div>
        {growth.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">
            No registration data in the last 30 days.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-left font-medium text-gray-500">
                    Date
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-gray-500">
                    New Users
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...growth].reverse().map((row) => (
                  <tr
                    key={row.date}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-gray-700 font-mono text-xs">
                      {row.date}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-900 font-medium">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
