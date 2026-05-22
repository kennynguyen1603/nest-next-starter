"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  users: "Users",
  reports: "Reports",
  settings: "Settings",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-sm font-medium text-gray-900">Dashboard</span>;
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Link
        href="/"
        className="text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
      >
        Dashboard
      </Link>
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        const label = LABELS[seg] ?? seg;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight
              size={14}
              className="text-gray-400"
              aria-hidden="true"
            />
            {isLast ? (
              <span aria-current="page" className="font-medium text-gray-900">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
