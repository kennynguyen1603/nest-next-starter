"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Spinner } from "@repo/ui/spinner";
import { AuthSuccessState } from "@/components/auth-success-state";

type Status = "loading" | "success" | "error";

function ConfirmNewEmailContent() {
  const t = useTranslations("auth.confirmNewEmail");
  const searchParams = useSearchParams();
  const hash = searchParams.get("hash");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  // The link is single-use: guard against the StrictMode double effect run.
  const submittedHash = useRef<string | null>(null);

  useEffect(() => {
    if (!hash) {
      setStatus("error");
      setErrorMessage(t("errorMissingHash"));
      return;
    }
    if (submittedHash.current === hash) return;
    submittedHash.current = hash;

    api
      .post<void>("/api/v1/auth/email/confirm/new", { hash })
      .then(() => setStatus("success"))
      .catch((err: unknown) => {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : t("errorDefault"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  if (status === "loading") {
    return (
      <div className="mb-8 flex flex-col items-start gap-4">
        <Spinner size="lg" variant="neutral" />
        <p className="text-small text-muted">{t("loading")}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <AuthSuccessState
        title={t("successTitle")}
        message={t("successMessage")}
        backLabel={t("backToSignIn")}
      />
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-h1">{t("title")}</h1>
        <Alert className="mt-2">{errorMessage}</Alert>
      </div>
      <Link
        href="/login"
        className="text-small font-medium text-foreground underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        {t("backToSignIn")}
      </Link>
    </>
  );
}

export default function ConfirmNewEmailPage() {
  return (
    <Suspense>
      <ConfirmNewEmailContent />
    </Suspense>
  );
}
