"use client";

import { useState, useMemo, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Spinner } from "@/components/spinner";
import { FormField } from "@/components/form-field";
import { ServerError } from "@/components/server-error";
import { AuthSuccessState } from "@/components/auth-success-state";

type FormValues = { password: string };

function ResetPasswordContent() {
  const t = useTranslations("auth.resetPassword");
  const searchParams = useSearchParams();
  const hash = searchParams.get("hash");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  const schema = useMemo(
    () =>
      z.object({
        password: z
          .string()
          .min(8, t("errorPasswordLength"))
          .regex(
            /^(?=.*[A-Za-z])(?=.*\d)[\d!#$%&*@A-Za-z^]+$/,
            t("errorPasswordComplexity"),
          ),
      }),
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
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>
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
      <AuthSuccessState
        title={t("successTitle")}
        message={t("successMessage")}
        backLabel={t("backToSignIn")}
      />
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
        <FormField
          id="password"
          label={t("password")}
          error={errors.password?.message}
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
            {...register("password")}
          />
        </FormField>

        {serverError && <ServerError message={serverError} />}

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white text-sm font-medium py-3.5 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 flex items-center justify-center gap-2 mt-1"
        >
          {isSubmitting && <Spinner variant="white" />}
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
