"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { FormField } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { AuthSuccessState } from "@/components/auth-success-state";

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
        <p className="mt-2 text-small text-muted">{t("description")}</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField id="email" label={t("email")} error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com…"
            invalid={!!errors.email}
            {...register("email")}
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
