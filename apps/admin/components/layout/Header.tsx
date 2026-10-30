"use client";

import { useAuthStore } from "@/lib/auth-store";
import Breadcrumb from "./Breadcrumb";

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const initials =
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .map((n) => n![0])
      .join("")
      .toUpperCase() || "?";

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 shrink-0">
      <Breadcrumb />
      <div className="size-8 bg-foreground text-background flex items-center justify-center text-caption font-semibold">
        {initials}
      </div>
    </header>
  );
}
