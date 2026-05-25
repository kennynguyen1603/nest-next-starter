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
  const { user, clearAuth } = useAuthStore();
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
      className={`${collapsed ? "w-16" : "w-60"} shrink-0 bg-sidebar text-gray-300 flex flex-col transition-[width] duration-200 ease-in-out overflow-hidden`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-gray-800 shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-white text-sm truncate">
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
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-2 space-y-1">
        {!collapsed && user && (
          <p className="px-3 py-1.5 text-xs text-gray-500 truncate">
            {user.firstName || user.email}
          </p>
        )}
        <button
          onClick={logout}
          aria-label="Logout"
          title="Logout"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-full py-2 rounded-lg text-gray-600 hover:bg-gray-800 hover:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
