"use client";

import { useState, useEffect, Suspense, lazy } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { api, tryRefresh } from "@/lib/api";
import type { AuthUser } from "@repo/types";
import Image from "next/image";
import { LanguageSwitcher } from "./_components/language-switcher";
import { Spinner } from "@/components/spinner";

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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F8F8]">
        <Spinner size="md" role="status" aria-label={t("common.loading")} />
      </div>
    );
  }

  const initial = (user.firstName?.[0] ?? user.email?.[0] ?? "U").toUpperCase();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="min-h-screen bg-[#F8F8F8] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E8E8E8] sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 h-14 max-w-2xl mx-auto w-full">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400">
            {t("common.appName")}
          </span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-1.5 hover:bg-neutral-50 hover:border-neutral-400 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
            >
              {t("home.signOut")}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-2xl space-y-6">
          {/* Profile identity */}
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={fullName || "Avatar"}
                width={48}
                height={48}
                className="object-cover shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-black flex items-center justify-center shrink-0">
                <span className="text-white text-base font-semibold leading-none select-none">
                  {initial}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold tracking-tight truncate">
                {fullName || user.email || "—"}
              </p>
              {fullName && (
                <p className="text-sm text-neutral-500 truncate">
                  {user.email}
                </p>
              )}
            </div>
          </div>

          {/* Account card */}
          <div className="bg-white border border-[#E8E8E8]">
            <div className="px-6 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-widest uppercase text-neutral-400">
                {t("home.accountInfo")}
              </span>
              <button
                onClick={() => setShowEdit(true)}
                className="text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-1.5 hover:bg-neutral-50 hover:border-neutral-400 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
              >
                {t("user.editProfile")}
              </button>
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              <InfoRow label={t("home.fullName")} value={fullName || "—"} />
              <InfoRow label={t("home.email")} value={user.email ?? "—"} />
              <InfoRow
                label={t("home.provider")}
                value={user.provider}
                capitalize
              />
              {user.status && (
                <div className="flex items-center px-6 py-4 gap-6">
                  <span className="w-28 shrink-0 text-xs font-medium text-neutral-400 uppercase tracking-wide">
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
          </div>

          {/* Danger zone */}
          <div className="pt-2 border-t border-[#E8E8E8]">
            <button
              onClick={() => setShowDelete(true)}
              className="text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 hover:bg-red-50 hover:border-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
            >
              {t("user.deleteAccount")}
            </button>
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
  inactive: "bg-neutral-100 text-neutral-500 border border-neutral-200",
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
  const style =
    STATUS_STYLES[status] ??
    "bg-neutral-100 text-neutral-500 border border-neutral-200";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${style}`}
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
      <span className="w-28 shrink-0 text-xs font-medium text-neutral-400 uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-sm text-neutral-800 truncate ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
