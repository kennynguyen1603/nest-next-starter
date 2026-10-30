"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import {
  formatNotificationDate,
  notificationsUrl,
  timeAgo,
  type Notification,
  type NotificationFilter,
  type NotificationsResponse,
} from "@/lib/notifications";
import { AppShell } from "../_components/app-shell";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Spinner } from "@repo/ui/spinner";

export default function NotificationsPage() {
  return (
    <AppShell>
      <Notifications />
    </AppShell>
  );
}

function Notifications() {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [unread, setUnread] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<Notification["id"] | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<NotificationsResponse>(notificationsUrl(page, filter))
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [page, filter, reload]);

  // The badge counts every unread notification, not just the loaded page.
  useEffect(() => {
    let cancelled = false;
    api
      .get<NotificationsResponse>("/api/v1/notifications?isRead=false&limit=1")
      .then((d) => !cancelled && setUnread(d.pagination.totalRecords))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function load(nextPage: number, nextFilter: NotificationFilter) {
    setData(null);
    setLoadError(false);
    setActionError(null);
    setPage(nextPage);
    setFilter(nextFilter);
  }

  function retryLoad() {
    setData(null);
    setLoadError(false);
    setReload((r) => r + 1);
  }

  function removeRow(id: Notification["id"]) {
    const remaining = (data?.pagination.totalRecords ?? 1) - 1;
    if (data?.data.length === 1 && remaining > 0) {
      // The page is now empty but others still have rows: load a neighbour.
      setData(null);
      if (page > 1) setPage(page - 1);
      else setReload((r) => r + 1);
      return;
    }
    setData(
      (prev) =>
        prev && {
          data: prev.data.filter((n) => n.id !== id),
          pagination: { ...prev.pagination, totalRecords: remaining },
        },
    );
  }

  async function handleMarkRead(id: Notification["id"]) {
    setActionError(null);
    setPendingId(id);
    try {
      await api.patch(`/api/v1/notifications/${id}/read`);
      if (filter === "unread") {
        removeRow(id);
      } else {
        setData(
          (prev) =>
            prev && {
              ...prev,
              data: prev.data.map((n) =>
                n.id === id ? { ...n, isRead: true } : n,
              ),
            },
        );
      }
      setUnread((u) => (u === null ? u : Math.max(0, u - 1)));
    } catch {
      setActionError(t("errorMarkRead"));
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(target: Notification) {
    setActionError(null);
    setPendingId(target.id);
    try {
      await api.delete(`/api/v1/notifications/${target.id}`);
      removeRow(target.id);
      if (!target.isRead) {
        setUnread((u) => (u === null ? u : Math.max(0, u - 1)));
      }
    } catch {
      setActionError(t("errorDelete"));
    } finally {
      setPendingId(null);
    }
  }

  async function handleMarkAllRead() {
    setActionError(null);
    setBulkPending(true);
    try {
      await api.patch("/api/v1/notifications/read-all");
      if (filter === "unread") {
        setData({
          data: [],
          pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 },
        });
        setPage(1);
      } else {
        setData(
          (prev) =>
            prev && {
              ...prev,
              data: prev.data.map((n) => ({ ...n, isRead: true })),
            },
        );
      }
      setUnread(0);
    } catch {
      setActionError(t("errorMarkAllRead"));
    } finally {
      setBulkPending(false);
    }
  }

  async function handleClearAll() {
    setConfirmClearAll(false);
    setActionError(null);
    setBulkPending(true);
    try {
      await api.delete("/api/v1/notifications");
      setData({
        data: [],
        pagination: { currentPage: 1, totalPages: 0, totalRecords: 0 },
      });
      setPage(1);
      setUnread(0);
    } catch {
      setActionError(t("errorClearAll"));
    } finally {
      setBulkPending(false);
    }
  }

  const busy = bulkPending || pendingId !== null;
  const pagination = data?.pagination;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-h2">{t("title")}</h1>
          {unread !== null && unread > 0 && (
            <span className="px-1.5 py-0.5 text-caption font-medium bg-foreground text-background">
              {t("unreadCount", { count: unread })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={busy || !data || unread === 0}
          >
            {t("markAllRead")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmClearAll(true)}
            disabled={
              busy ||
              !data ||
              (filter === "all" && pagination?.totalRecords === 0)
            }
          >
            {t("clearAll")}
          </Button>
        </div>
      </div>

      <section
        aria-label={t("title")}
        className="bg-background border border-border"
      >
        <div className="px-6 py-4 border-b border-border">
          <div
            role="group"
            aria-label={t("filterLabel")}
            className="flex gap-2"
          >
            {(["all", "unread"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "primary" : "ghost"}
                size="sm"
                aria-pressed={filter === f}
                onClick={() => filter !== f && load(1, f)}
              >
                {f === "all" ? t("tabAll") : t("tabUnread")}
              </Button>
            ))}
          </div>
        </div>

        {actionError && (
          <div className="px-6 pt-4">
            <Alert>{actionError}</Alert>
          </div>
        )}

        {loadError ? (
          <div className="px-6 py-4 space-y-3">
            <Alert>{t("errorLoad")}</Alert>
            <Button variant="secondary" size="sm" onClick={retryLoad}>
              {tCommon("retry")}
            </Button>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" role="status" aria-label={tCommon("loading")} />
          </div>
        ) : data.data.length === 0 ? (
          <p className="px-6 py-12 text-center text-small text-muted">
            {filter === "unread" ? t("emptyUnread") : t("empty")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.data.map((n) => {
              const ago = timeAgo(n.createdAt);
              return (
                <li key={n.id} className="flex items-start gap-3 px-6 py-4">
                  <span
                    aria-hidden
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
                    <time
                      dateTime={n.createdAt}
                      className="block text-caption text-muted mt-1"
                    >
                      {ago
                        ? t(ago.key, { count: ago.count ?? 0 })
                        : formatNotificationDate(n.createdAt, locale)}
                    </time>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.isRead && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={busy}
                      >
                        {t("markRead")}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDelete(n)}
                      disabled={busy}
                    >
                      {t("delete")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => load(page - 1, filter)}
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
            onClick={() => load(page + 1, filter)}
            disabled={!pagination.nextPage}
          >
            {t("next")}
          </Button>
        </div>
      )}

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
              {tCommon("cancel")}
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
