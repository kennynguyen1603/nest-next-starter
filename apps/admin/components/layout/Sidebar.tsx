"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Bell,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/users", label: "Users", icon: Users, exact: false },
  ...(process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED === "true"
    ? [
        {
          href: "/notifications",
          label: "Notifications",
          icon: Bell,
          exact: false,
        },
      ]
    : []),
  { href: "/reports", label: "Reports", icon: BarChart2, exact: false },
  { href: "/settings", label: "Settings", icon: Settings, exact: false },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("admin-sidebar-collapsed", String(next));
      return next;
    });
  }

  async function logout() {
    try {
      await api.post("/api/v1/auth/logout");
    } catch {
      // clear auth regardless
    }
    clearAuth();
    router.push("/login");
  }

  return (
    <aside
      className={`w-16 ${collapsed ? "md:w-16" : "md:w-60"} shrink-0 bg-sidebar text-sidebar-foreground flex flex-col transition-[width] duration-200 ease-in-out overflow-hidden`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="size-8 bg-white text-sidebar flex items-center justify-center text-small font-semibold shrink-0">
          A
        </div>
        {!collapsed && (
          <span className="hidden md:inline text-small font-semibold text-white truncate">
            Admin Panel
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-hidden">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`flex items-center gap-3 px-3 py-2.5 text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                active
                  ? "bg-white text-sidebar"
                  : "text-sidebar-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="size-4.5 shrink-0" />
              <span
                className={
                  collapsed ? "sr-only" : "sr-only md:not-sr-only truncate"
                }
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && user && (
          <p className="hidden md:block px-3 py-1.5 text-caption text-sidebar-muted truncate">
            {user.firstName || user.email}
          </p>
        )}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-3 w-full px-3 py-2.5 text-small text-sidebar-muted hover:bg-white/5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <LogOut className="size-4.5 shrink-0" />
          <span className={collapsed ? "sr-only" : "sr-only md:not-sr-only"}>
            Logout
          </span>
        </button>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex items-center justify-center w-full py-2 text-sidebar-muted hover:bg-white/5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
