import type { AdminActivity } from "@repo/types";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

function timeAgo(date: string): string {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return rtf.format(Math.round(seconds / size), unit);
    }
  }
  return rtf.format(Math.round(seconds), "second");
}

export default function RecentActivity({ items }: { items: AdminActivity[] }) {
  if (items.length === 0) {
    return (
      <p className="text-small text-muted py-10 text-center">
        No recent activity
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 px-5 py-3.5">
          <div
            aria-hidden="true"
            className="size-8 bg-surface border border-border flex items-center justify-center text-caption font-medium shrink-0"
          >
            {item.userName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-small">
              <span className="font-medium">{item.userName}</span>{" "}
              <span className="text-muted">{item.action}</span>{" "}
              <span className="font-medium">{item.target}</span>
            </p>
            <p className="text-caption text-muted">{timeAgo(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
