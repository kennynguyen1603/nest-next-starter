"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { api, tryRefresh } from "@/lib/api";
import type { AuthUser } from "@repo/types";
import { LanguageSwitcher } from "./_components/language-switcher";
import { EditProfileDialog } from "./_components/edit-profile-dialog";
import { DeleteAccountDialog } from "./_components/delete-account-dialog";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function Home() {
  const router = useRouter();
  const { accessToken, tokenExpires, user, clearAuth, setAuth } = useAuthStore();
  const t = useTranslations();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const pending = localStorage.getItem("_oauth_result");
      if (pending) {
        localStorage.removeItem("_oauth_result");
        try {
          const { token, tokenExpires: exp, user: u } = JSON.parse(pending);
          setAuth(token, exp, u);
        } catch {
          router.replace("/login");
        }
        return;
      }

      if (!accessToken) {
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
        <div
          role="status"
          aria-label={t("common.loading")}
          className="w-5 h-5 border-2 border-black border-t-transparent animate-spin rounded-full"
        />
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
              <img
                src={photoUrl}
                alt={fullName || "Avatar"}
                className="w-12 h-12 object-cover shrink-0"
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
                <p className="text-sm text-neutral-500 truncate">{user.email}</p>
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
        <EditProfileDialog
          user={user}
          currentPhotoUrl={photoUrl}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showDelete && (
        <DeleteAccountDialog onClose={() => setShowDelete(false)} />
      )}
    </div>
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
