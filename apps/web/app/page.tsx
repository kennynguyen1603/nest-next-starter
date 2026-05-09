"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { tryRefresh } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const { accessToken, user, clearAuth, setAuth } = useAuthStore();

  useEffect(() => {
    const pending = localStorage.getItem("_oauth_result");
    if (pending) {
      localStorage.removeItem("_oauth_result");
      try {
        const { token, tokenExpires, user: u } = JSON.parse(pending);
        setAuth(token, tokenExpires, u);
      } catch {
        router.replace("/login");
      }
      return;
    }

    if (!accessToken) {
      tryRefresh().then((ok) => {
        if (!ok) router.replace("/login");
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div
          role="status"
          aria-label="Loading…"
          className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full"
        />
      </div>
    );
  }

  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "there";

  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <header className="bg-white border-b border-[#E8E8E8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400">
            Starter
          </span>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-sm text-neutral-500 hidden sm:block truncate min-w-0 max-w-48">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-1.5 hover:bg-neutral-50 hover:border-neutral-400 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            Hello, {fullName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            This is your account dashboard.
          </p>
        </div>

        <div className="bg-white border border-[#E8E8E8]">
          <div className="px-4 sm:px-6 py-4 border-b border-[#E8E8E8]">
            <h2 className="text-[11px] font-semibold tracking-widest uppercase text-neutral-400">
              Account Information
            </h2>
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 py-4 gap-1 sm:gap-4">
              <span className="sm:w-28 text-xs font-medium text-neutral-400 uppercase tracking-wide shrink-0">
                Full Name
              </span>
              <span className="text-sm text-neutral-800">
                {[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                  "—"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 py-4 gap-1 sm:gap-4">
              <span className="sm:w-28 text-xs font-medium text-neutral-400 uppercase tracking-wide shrink-0">
                Email
              </span>
              <span className="text-sm text-neutral-800 truncate min-w-0">
                {user?.email ?? "—"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center px-4 sm:px-6 py-4 gap-1 sm:gap-4">
              <span className="sm:w-28 text-xs font-medium text-neutral-400 uppercase tracking-wide shrink-0">
                Provider
              </span>
              <span className="text-sm text-neutral-800 capitalize">
                {user?.provider ?? "—"}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
