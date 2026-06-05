"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { tryRefresh } from "@/lib/api";

/**
 * Hydrates the in-memory session once per dashboard mount from the httpOnly
 * refresh cookie, so the chrome (Header/Sidebar user) is populated on every
 * route — not only on pages that happen to fetch. tryRefresh is deduped, so
 * this never double-fires with a page's own refresh.
 */
export default function AuthBootstrap() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!useAuthStore.getState().accessToken) {
      void tryRefresh();
    }
  }, []);
  return null;
}
