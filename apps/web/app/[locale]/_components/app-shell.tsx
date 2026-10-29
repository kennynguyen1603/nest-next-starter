"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { api, tryRefresh } from "@/lib/api";
import { NAV_ITEMS, isActivePath } from "@/lib/nav";
import type { AuthUser } from "@repo/types";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Wraps every signed-in page: restores the session, then renders the header
// and the page. Children only mount once both the token and the user exist.
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Per-field selectors so unrelated store writes don't re-render the shell.
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const t = useTranslations();

  useEffect(() => {
    async function init() {
      if (!useAuthStore.getState().accessToken) {
        // Restores the session from the httpOnly refresh cookie (also covers the
        // OAuth callback, which set that cookie before redirecting here).
        const ok = await tryRefresh();
        if (!ok) {
          router.replace("/login");
          return;
        }
      }

      const {
        accessToken: token,
        tokenExpires,
        user: current,
        setAuth,
      } = useAuthStore.getState();
      if (token && !current) {
        try {
          const fetched = await api.get<AuthUser>("/api/v1/auth/me");
          setAuth(token, tokenExpires!, fetched);
        } catch {
          clearAuth();
          router.replace("/login");
        }
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    try {
      await fetch(`${BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } finally {
      clearAuth();
      router.push("/login");
    }
  }

  if (!accessToken || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner size="md" role="status" aria-label={t("common.loading")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-x-8 px-6 max-w-4xl mx-auto w-full">
          <span className="h-14 flex items-center text-label uppercase text-muted">
            {t("common.appName")}
          </span>
          <nav
            aria-label={t("nav.label")}
            className="order-last w-full sm:order-none sm:w-auto h-11 sm:h-14 flex items-center gap-6 overflow-x-auto"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(item.href, pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-small whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground ${
                    active
                      ? "text-foreground font-medium underline underline-offset-8 decoration-2"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t(`nav.${item.key}`)}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto h-14 flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              {t("home.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
