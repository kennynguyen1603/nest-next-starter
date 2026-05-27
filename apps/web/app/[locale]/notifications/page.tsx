"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { api, tryRefresh } from "@/lib/api";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  nextPage?: number;
  previousPage?: number;
}

interface NotificationsResponse {
  data: Notification[];
  pagination: PaginationMeta;
}

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const t = useTranslations("notifications");

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const fetchNotifications = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<NotificationsResponse>(
          `/api/v1/notifications?page=${p}&limit=${PAGE_SIZE}`,
        );
        setNotifications(res.data);
        setPagination(res.pagination);
      } catch {
        setError(t("errorLoad"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!accessToken) {
      tryRefresh().then((ok) => {
        if (!ok) router.replace("/login");
      });
      return;
    }
    fetchNotifications(page);
  }, [accessToken, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMarkAsRead(id: string) {
    try {
      const updated = await api.patch<Notification>(
        `/api/v1/notifications/${id}/read`,
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: updated.isRead } : n)),
      );
    } catch {
      // silently ignore
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/v1/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (pagination) {
        setPagination((p) =>
          p ? { ...p, totalRecords: p.totalRecords - 1 } : p,
        );
      }
    } catch {
      // silently ignore
    }
  }

  async function handleMarkAllAsRead() {
    setActionLoading(true);
    try {
      await api.patch("/api/v1/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silently ignore
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearAll() {
    setConfirmClearAll(false);
    setActionLoading(true);
    try {
      await api.delete("/api/v1/notifications");
      setNotifications([]);
      setPagination((p) => (p ? { ...p, totalRecords: 0, totalPages: 0 } : p));
    } catch {
      // silently ignore
    } finally {
      setActionLoading(false);
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);

    if (diffH < 1) return t("timeJustNow");
    if (diffH < 24) return t("timeHoursAgo", { count: diffH });
    if (diffD === 1) return t("timeYesterday");
    if (diffD < 7) return t("timeDaysAgo", { count: diffD });
    return date.toLocaleDateString();
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col">
      <header className="bg-white border-b border-[#E8E8E8] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-xs text-neutral-500 hover:text-black transition-colors"
            >
              ←
            </button>
            <span className="font-semibold text-sm">
              {t("title")}
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-black text-white px-1.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllAsRead}
              disabled={actionLoading || notifications.every((n) => n.isRead)}
              className="text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-1.5 hover:bg-neutral-50 hover:border-neutral-400 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("markAllRead")}
            </button>
            <button
              onClick={() => setConfirmClearAll(true)}
              disabled={actionLoading || notifications.length === 0}
              className="text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("clearAll")}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 sm:px-6 py-6">
        <div className="w-full max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full" />
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 text-center py-10">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-neutral-400 text-sm">{t("empty")}</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-[#E8E8E8] divide-y divide-[#F0F0F0]">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-4 ${!n.isRead ? "bg-white" : "bg-[#FAFAFA]"}`}
                  >
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? "bg-black" : "bg-[#D0D0D0]"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${!n.isRead ? "text-black" : "text-neutral-500"}`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          title={t("markRead")}
                          className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-black transition-colors"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        title={t("delete")}
                        className="w-7 h-7 flex items-center justify-center text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!pagination.previousPage}
                    className="text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("previous")}
                  </button>
                  <span className="text-xs text-neutral-400">
                    {t("pageOf", {
                      current: pagination.currentPage,
                      total: pagination.totalPages,
                    })}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.nextPage}
                    className="text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-1.5 hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t("next")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {confirmClearAll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white border border-[#E8E8E8] w-full max-w-sm p-6">
            <p className="text-sm font-medium">{t("clearAllConfirm")}</p>
            <p className="text-xs text-neutral-500 mt-1">
              {t("clearAllWarning")}
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmClearAll(false)}
                className="flex-1 text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-2 hover:bg-neutral-50 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 text-xs font-medium text-white bg-red-600 px-3 py-2 hover:bg-red-700 transition-colors"
              >
                {t("confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
