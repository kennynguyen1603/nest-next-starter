"use client";

import { useState, useMemo, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { FormField } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
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
          <h1 className="text-h1">{t("title")}</h1>
          <Alert className="mt-2">{t("errorMissingHash")}</Alert>
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
        <h1 className="text-h1">{t("title")}</h1>
        <p className="mt-2 text-small text-muted">{t("description")}</p>
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
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            invalid={!!errors.password}
            {...register("password")}
          />
        </FormField>

        {serverError && <Alert>{serverError}</Alert>}

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-1">
          {isSubmitting ? t("submitting") : t("submit")}
        </Button>
      </form>

      <div className="mt-6">
        <Link
          href="/login"
          className="text-small font-medium text-foreground underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
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
