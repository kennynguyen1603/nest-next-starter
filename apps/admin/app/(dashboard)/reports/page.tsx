"use client";

import { useEffect, useState } from "react";
import { Users, UserCheck, UserX, TrendingUp } from "lucide-react";
import { api, tryRefresh } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import type { UserGrowthPoint } from "@repo/types";

interface UserSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  userGrowthPercent: number;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

function LineChart({ data }: { data: UserGrowthPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No data available
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 16, right: 16, bottom: 32, left: 36 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const minCount = 0;

  const xStep = chartW / Math.max(data.length - 1, 1);

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) =>
    PAD.top + chartH - ((v - minCount) / (maxCount - minCount)) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.count)}`).join(" ");
  const areaPoints = [
    `${toX(0)},${PAD.top + chartH}`,
    ...data.map((d, i) => `${toX(i)},${toY(d.count)}`),
    `${toX(data.length - 1)},${PAD.top + chartH}`,
  ].join(" ");

  // Y-axis ticks
  const yTicks = [0, Math.round(maxCount / 2), maxCount];

  // X-axis labels — show first, middle, last
  const xLabels = [
    { i: 0, label: data[0]!.date.slice(5) },
    {
      i: Math.floor(data.length / 2),
      label: data[Math.floor(data.length / 2)]!.date.slice(5),
    },
    { i: data.length - 1, label: data[data.length - 1]!.date.slice(5) },
  ].filter((item, idx, arr) => arr.findIndex((a) => a.i === item.i) === idx);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-48"
      aria-label="User growth chart"
    >
      {/* Grid lines */}
      {yTicks.map((v) => (
        <line
          key={v}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={toY(v)}
          y2={toY(v)}
          stroke="#f0f0f0"
          strokeWidth={1}
        />
      ))}

      {/* Area fill */}
      <polygon points={areaPoints} fill="#6366f1" fillOpacity={0.08} />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(d.count)}
          r={3}
          fill="#6366f1"
          stroke="white"
          strokeWidth={1.5}
        />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((v) => (
        <text
          key={v}
          x={PAD.left - 6}
          y={toY(v) + 4}
          textAnchor="end"
          fontSize={10}
          fill="#9ca3af"
        >
          {v}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map(({ i, label }) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#9ca3af"
        >
          {label}
        </text>
      ))}
    </svg>
  );
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
