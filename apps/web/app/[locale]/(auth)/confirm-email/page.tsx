"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/api";

type Status = "loading" | "success" | "error";

function ConfirmEmailContent() {
  const t = useTranslations("auth.confirmEmail");
  const searchParams = useSearchParams();
  const router = useRouter();
  const hash = searchParams.get("hash");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!hash) {
      setStatus("error");
      setErrorMessage(t("errorMissingHash"));
      return;
    }

    api
      .post<void>("/api/v1/auth/email/confirm", { hash })
      .then(() => {
        setStatus("success");
        const timer = setTimeout(() => router.push("/login"), 3000);
        return () => clearTimeout(timer);
      })
      .catch((err: unknown) => {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : t("errorDefault"));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  if (status === "loading") {
    return (
      <div className="mb-8 flex flex-col items-start gap-4">
        <span className="w-6 h-6 border-2 border-neutral-300 border-t-black animate-spin rounded-full" />
        <p className="text-sm text-neutral-500">{t("loading")}</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("successTitle")}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{t("successMessage")}</p>
        </div>
        <Link
          href="/login"
          className="text-sm font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          {t("backToSignIn")}
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p
          role="alert"
          className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5"
        >
          {errorMessage}
        </p>
      </div>
      <Link
        href="/login"
        className="text-sm font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        {t("backToSignIn")}
      </Link>
    </>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <ConfirmEmailContent />
    </Suspense>
  );
}
