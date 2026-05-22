import { formatDistanceToNow } from "date-fns";
import type { AdminActivity } from "@repo/types";

export default function RecentActivity({ items }: { items: AdminActivity[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        No recent activity
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3">
          <div
            aria-hidden="true"
            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0"
          >
            {item.userName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900">
              <span className="font-medium">{item.userName}</span>{" "}
              <span className="text-gray-500">{item.action}</span>{" "}
              <span className="font-medium">{item.target}</span>
            </p>
            <p className="text-xs text-gray-400">
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
