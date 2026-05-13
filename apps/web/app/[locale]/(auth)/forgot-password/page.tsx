"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/api";

type FormValues = { email: string };

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const schema = useMemo(
    () => z.object({ email: z.string().email(t("errorInvalidEmail")) }),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await api.post("/api/v1/auth/forgot/password", values);
      setSuccess(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("errorDefault"));
    }
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
            htmlFor="email"
            className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
          >
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com…"
            className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
            {...register("email")}
          />
          {errors.email && (
            <span role="alert" className="text-xs text-red-600">
              {errors.email.message}
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
