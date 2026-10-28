import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
}

export default function StatsCard({ label, value, icon: Icon, trend }: Props) {
  return (
    <div className="bg-background p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-label uppercase text-muted">{label}</span>
        <Icon size={16} aria-hidden="true" className="text-muted" />
      </div>
      <p className="text-h1 tabular-nums">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {trend !== undefined && (
        <p
          className={`text-caption mt-2 ${trend >= 0 ? "text-green-600" : "text-red-600"}`}
        >
          <span aria-hidden="true">{trend >= 0 ? "↑" : "↓"}</span>
          <span className="sr-only">{trend >= 0 ? "Up" : "Down"}</span>{" "}
          {Math.abs(trend)}% vs last month
        </p>
      )}
    </div>
  );
}
