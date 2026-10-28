"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { api, tryRefresh } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Spinner } from "@repo/ui/spinner";

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
  const accessToken = useAuthStore((s) => s.accessToken);
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              aria-label="Back"
              className="size-8 flex items-center justify-center text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
            >
              ←
            </button>
            <h1 className="text-small font-semibold">
              {t("title")}
              {unreadCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-caption bg-foreground text-background">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={actionLoading || notifications.every((n) => n.isRead)}
            >
              {t("markAllRead")}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmClearAll(true)}
              disabled={actionLoading || notifications.length === 0}
            >
              {t("clearAll")}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="md" />
            </div>
          ) : error ? (
            <Alert>{error}</Alert>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-small text-muted">{t("empty")}</p>
            </div>
          ) : (
            <>
              <div className="bg-background border border-border divide-y divide-border">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-5 py-4 ${!n.isRead ? "bg-background" : "bg-surface"}`}
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 ${!n.isRead ? "bg-foreground" : "bg-border-strong"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-small font-medium truncate ${!n.isRead ? "text-foreground" : "text-muted"}`}
                      >
                        {n.title}
                      </p>
                      <p className="text-caption text-muted mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-caption text-muted mt-1">
                        {formatTime(n.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          title={t("markRead")}
                          className="size-7 flex items-center justify-center text-muted hover:text-foreground transition-colors"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        title={t("delete")}
                        className="size-7 flex items-center justify-center text-muted hover:text-red-600 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={!pagination.previousPage}
                  >
                    {t("previous")}
                  </Button>
                  <span className="text-caption text-muted">
                    {t("pageOf", {
                      current: pagination.currentPage,
                      total: pagination.totalPages,
                    })}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!pagination.nextPage}
                  >
                    {t("next")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {confirmClearAll && (
        <Dialog
          title={t("clearAllConfirm")}
          onClose={() => setConfirmClearAll(false)}
        >
          <p className="text-small text-muted">{t("clearAllWarning")}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setConfirmClearAll(false)}
            >
              {t("cancel")}
            </Button>
            <Button variant="danger" onClick={handleClearAll}>
              {t("confirmDelete")}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
