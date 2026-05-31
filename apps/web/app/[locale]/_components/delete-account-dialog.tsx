"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { Spinner } from "@/components/spinner";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "@/lib/navigation";

interface Props {
  onClose: () => void;
}

export function DeleteAccountDialog({ onClose }: Props) {
  const t = useTranslations("user");
  const { clearAuth } = useAuthStore();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleDelete() {
    setIsDeleting(true);
    setServerError("");
    try {
      await api.delete("/api/v1/auth/me");
      clearAuth();
      router.push("/login");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("errorDefault"));
      setIsDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-sm shadow-xl">
        <div className="px-6 py-4 border-b border-[#E8E8E8]">
          <h2 className="text-sm font-semibold">{t("deleteAccount")}</h2>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-sm text-neutral-600">{t("deleteConfirm")}</p>

          {serverError && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5"
            >
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="text-sm font-medium text-neutral-600 border border-[#D0D0D0] px-4 py-2 hover:bg-neutral-50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 flex items-center gap-2"
            >
              {isDeleting && <Spinner size="xs" variant="white" />}
              {isDeleting ? t("deleting") : t("deleteAccount")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
