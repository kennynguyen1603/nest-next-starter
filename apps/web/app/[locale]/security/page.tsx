"use client";

import { useState, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "@/lib/api";
import {
  deviceLabel,
  formatLastActive,
  sortSessions,
  type Session,
} from "@/lib/sessions";
import { AppShell } from "../_components/app-shell";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { Spinner } from "@repo/ui/spinner";

export default function SecurityPage() {
  return (
    <AppShell>
      <Sessions />
    </AppShell>
  );
}

function Sessions() {
  const t = useTranslations("security");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<Session["id"] | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<Session[]>("/api/v1/auth/sessions")
      .then((d) => !cancelled && setSessions(sortSessions(d)))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRevoke(id: Session["id"]) {
    setActionError(null);
    setPendingId(id);
    try {
      await api.delete(`/api/v1/auth/sessions/${id}`);
      setSessions((prev) => prev && prev.filter((s) => s.id !== id));
    } catch {
      setActionError(t("errorRevoke"));
    } finally {
      setPendingId(null);
    }
  }

  async function handleRevokeAll() {
    setConfirmAll(false);
    setActionError(null);
    setRevokingAll(true);
    try {
      await api.delete("/api/v1/auth/sessions");
      setSessions((prev) => prev && prev.filter((s) => s.isCurrent));
    } catch {
      setActionError(t("errorRevokeAll"));
    } finally {
      setRevokingAll(false);
    }
  }

  const others = sessions?.filter((s) => !s.isCurrent).length ?? 0;
  const busy = revokingAll || pendingId !== null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-h2">{t("title")}</h1>
        <p className="text-small text-muted">{t("subtitle")}</p>
      </div>

      <section
        aria-labelledby="sessions-heading"
        className="bg-background border border-border"
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <h2 id="sessions-heading" className="text-label uppercase text-muted">
            {t("sessionsHeading")}
          </h2>
          {others > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConfirmAll(true)}
              disabled={busy}
            >
              {t("revokeAll")}
            </Button>
          )}
        </div>

        {actionError && (
          <div className="px-6 pt-4">
            <Alert>{actionError}</Alert>
          </div>
        )}

        {loadError ? (
          <div className="px-6 py-4">
            <Alert>{t("errorLoad")}</Alert>
          </div>
        ) : !sessions ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="md" role="status" aria-label={tCommon("loading")} />
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-small font-medium text-foreground truncate">
                      {deviceLabel(s) ?? t("unknownDevice")}
                      {s.isCurrent && (
                        <span className="ml-2 px-1.5 py-0.5 text-caption font-medium bg-foreground text-background">
                          {t("thisDevice")}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-caption text-muted">
                      {s.ipAddress && (
                        <>
                          {t("ipAddress", { ip: s.ipAddress })}
                          {" · "}
                        </>
                      )}
                      {t("lastActive", { time: formatLastActive(s, locale) })}
                    </p>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRevoke(s.id)}
                      disabled={busy}
                      className="shrink-0"
                    >
                      {t("revoke")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {others === 0 && (
              <p className="px-6 py-4 border-t border-border text-small text-muted">
                {t("noOtherSessions")}
              </p>
            )}
          </>
        )}
      </section>

      {confirmAll && (
        <Dialog
          title={t("revokeAllConfirm")}
          onClose={() => setConfirmAll(false)}
        >
          <p className="text-small text-muted">{t("revokeAllWarning")}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmAll(false)}>
              {tCommon("cancel")}
            </Button>
            <Button variant="danger" onClick={handleRevokeAll}>
              {t("revokeAll")}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
