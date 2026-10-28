import { formatDistanceToNow } from "date-fns";
import type { AdminActivity } from "@repo/types";

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
            <p className="text-caption text-muted">
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
