"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  users: "Users",
  notifications: "Notifications",
  reports: "Reports",
  settings: "Settings",
};

export default function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <span className="text-small font-medium">Dashboard</span>;
  }

  return (
    <nav className="flex items-center gap-1 text-small" aria-label="Breadcrumb">
      <Link
        href="/"
        className="text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
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
              className="text-border-strong"
              aria-hidden="true"
            />
            {isLast ? (
              <span aria-current="page" className="font-medium">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
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
