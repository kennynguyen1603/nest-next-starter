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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <Breadcrumb />
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
        {initials}
      </div>
    </header>
  );
}
