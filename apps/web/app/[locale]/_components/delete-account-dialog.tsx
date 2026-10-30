"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { useRouter } from "@/lib/navigation";

interface Props {
  onClose: () => void;
}

export function DeleteAccountDialog({ onClose }: Props) {
  const t = useTranslations("user");
  const commonT = useTranslations("common");
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [serverError, setServerError] = useState("");

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
    <Dialog title={t("deleteAccount")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-small text-muted">{t("deleteConfirm")}</p>

        {serverError && <Alert>{serverError}</Alert>}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            {commonT("cancel")}
          </Button>
          <Button variant="danger" loading={isDeleting} onClick={handleDelete}>
            {isDeleting ? t("deleting") : t("deleteAccount")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
