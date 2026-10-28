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

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const t = useTranslations("auth.register");

  const schema = useMemo(
    () =>
      z.object({
        firstName: z.string().min(1, t("errorFirstName")),
        lastName: z.string().min(1, t("errorLastName")),
        email: z.string().email(t("errorInvalidEmail")),
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
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await api.post("/api/v1/auth/email/register", values);
      setSuccess(true);
    } catch (err) {
      const details = (
        err as { details?: { property: string; message: string }[] }
      )?.details;
      if (details?.length) {
        const fields = new Set<string>([
          "firstName",
          "lastName",
          "email",
          "password",
        ]);
        let hasFieldError = false;
        for (const { property, message } of details) {
          if (fields.has(property)) {
            setError(property as keyof FormValues, { message });
            hasFieldError = true;
          }
        }
        if (!hasFieldError) {
          setServerError(
            err instanceof Error ? err.message : t("errorDefault"),
          );
        }
      } else {
        setServerError(err instanceof Error ? err.message : t("errorDefault"));
      }
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
        <p className="mt-2 text-small text-muted">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            id="firstName"
            label={t("firstName")}
            error={errors.firstName?.message}
          >
            <Input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="John…"
              invalid={!!errors.firstName}
              {...register("firstName")}
            />
          </FormField>
          <FormField
            id="lastName"
            label={t("lastName")}
            error={errors.lastName?.message}
          >
            <Input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Doe…"
              invalid={!!errors.lastName}
              {...register("lastName")}
            />
          </FormField>
        </div>

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
    </>
  );
}
