"use client";

import { useState, useMemo, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type FormValues = { password: string };

function ResetPasswordContent() {
  const t = useTranslations("auth.resetPassword");
  const searchParams = useSearchParams();
  const hash = searchParams.get("hash");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const schema = useMemo(
    () =>
      z.object({ password: z.string().min(8, t("errorPasswordLength")) }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!hash) {
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-2 text-sm text-red-600">{t("errorMissingHash")}</p>
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

  if (success) {
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

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await api.post("/api/v1/auth/reset/password", { hash, ...values });
      setSuccess(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("errorDefault"));
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t("description")}</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
          >
            {t("password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
            {...register("password")}
          />
          {errors.password && (
            <span role="alert" className="text-xs text-red-600">
              {errors.password.message}
            </span>
          )}
        </div>

        {serverError && (
          <p
            role="alert"
            aria-live="assertive"
            className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5"
          >
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white text-sm font-medium py-3.5 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 flex items-center justify-center gap-2 mt-1"
        >
          {isSubmitting && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full shrink-0" />
          )}
          {isSubmitting ? t("submitting") : t("submit")}
        </button>
      </form>

      <div className="mt-6">
        <Link
          href="/login"
          className="text-sm font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          {t("backToSignIn")}
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
