import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
}

export default function StatsCard({ label, value, icon: Icon, trend }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center">
          <Icon size={18} className="text-indigo-600" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-gray-900">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {trend !== undefined && (
        <p
          className={`text-xs mt-1 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last month
        </p>
      )}
    </div>
  );
}
