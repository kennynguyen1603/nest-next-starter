"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { api, tryRefresh } from "@/lib/api";
import type { AuthUser } from "@repo/types";
import Image from "next/image";
import { LanguageSwitcher } from "./_components/language-switcher";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";

const EditProfileDialog = lazy(() =>
  import("./_components/edit-profile-dialog").then((m) => ({
    default: m.EditProfileDialog,
  })),
);
const DeleteAccountDialog = lazy(() =>
  import("./_components/delete-account-dialog").then((m) => ({
    default: m.DeleteAccountDialog,
  })),
);

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function Home() {
  const router = useRouter();
  // Per-field selectors so unrelated store writes don't re-render the page.
  const accessToken = useAuthStore((s) => s.accessToken);
  const tokenExpires = useAuthStore((s) => s.tokenExpires);
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = useTranslations();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!accessToken) {
        // Restores the session from the httpOnly refresh cookie (also covers the
        // OAuth callback, which set that cookie before redirecting here).
        const ok = await tryRefresh();
        if (!ok) router.replace("/login");
        return;
      }

      if (!user) {
        try {
          const fetched = await api.get<AuthUser>("/api/v1/auth/me");
          setAuth(accessToken, tokenExpires!, fetched);
        } catch {
          clearAuth();
          router.replace("/login");
        }
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.photo?.id) {
      setPhotoUrl(null);
      return;
    }
    api
      .get<{ url: string }>(`/api/v1/files/${user.photo.id}/url`)
      .then((d) => setPhotoUrl(d.url))
      .catch(() => setPhotoUrl(null));
  }, [user?.photo?.id]);

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

  const initial = (user.firstName?.[0] ?? user.email?.[0] ?? "U").toUpperCase();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 h-14 max-w-2xl mx-auto w-full">
          <span className="text-label uppercase text-muted">
            {t("common.appName")}
          </span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              {t("home.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          {/* Profile identity */}
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={fullName || "Avatar"}
                width={48}
                height={48}
                // Presigned S3 URLs change on every request, so the optimizer can't cache them.
                unoptimized
                className="object-cover shrink-0"
              />
            ) : (
              <div className="size-12 bg-foreground flex items-center justify-center shrink-0">
                <span className="text-background text-h3 leading-none select-none">
                  {initial}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-h2 truncate">
                {fullName || user.email || "—"}
              </h1>
              {fullName && (
                <p className="text-small text-muted truncate">{user.email}</p>
              )}
            </div>
          </div>

          {/* Account card */}
          <section className="bg-background border border-border">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-label uppercase text-muted">
                {t("home.accountInfo")}
              </h2>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowEdit(true)}
              >
                {t("user.editProfile")}
              </Button>
            </div>
            <div className="divide-y divide-border">
              <InfoRow label={t("home.fullName")} value={fullName || "—"} />
              <InfoRow label={t("home.email")} value={user.email ?? "—"} />
              <InfoRow
                label={t("home.provider")}
                value={user.provider}
                capitalize
              />
              {user.status && (
                <div className="flex items-center px-6 py-4 gap-6">
                  <span className="w-28 shrink-0 text-label uppercase text-muted">
                    {t("home.status")}
                  </span>
                  <StatusBadge status={user.status} t={t} />
                </div>
              )}
              {user.roles && user.roles.length > 0 && (
                <InfoRow
                  label={t("home.role")}
                  value={user.roles.map((r) => r.name).join(", ")}
                  capitalize
                />
              )}
              {user.createdAt && (
                <InfoRow
                  label={t("home.memberSince")}
                  value={new Date(user.createdAt).toLocaleDateString()}
                />
              )}
            </div>
          </section>

          {/* Danger zone */}
          <div className="pt-6 border-t border-border">
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDelete(true)}
            >
              {t("user.deleteAccount")}
            </Button>
          </div>
        </div>
      </main>

      {showEdit && (
        <Suspense fallback={null}>
          <EditProfileDialog
            user={user}
            currentPhotoUrl={photoUrl}
            onClose={() => setShowEdit(false)}
          />
        </Suspense>
      )}
      {showDelete && (
        <Suspense fallback={null}>
          <DeleteAccountDialog onClose={() => setShowDelete(false)} />
        </Suspense>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700 border border-green-200",
  inactive: "bg-surface text-muted border border-border",
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  banned: "bg-red-50 text-red-600 border border-red-200",
};

function StatusBadge({
  status,
  t,
}: {
  status: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const key =
    `home.status${status.charAt(0).toUpperCase()}${status.slice(1)}` as Parameters<
      typeof t
    >[0];
  const label = t(key);
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.inactive;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-caption font-medium ${style}`}
    >
      {label}
    </span>
  );
}

function InfoRow({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center px-6 py-4 gap-6">
      <span className="w-28 shrink-0 text-label uppercase text-muted">
        {label}
      </span>
      <span
        className={`text-small text-foreground truncate ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
