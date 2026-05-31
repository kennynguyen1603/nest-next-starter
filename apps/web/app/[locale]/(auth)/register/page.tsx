"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/navigation";
import { api } from "@/lib/api";
import { Spinner } from "@/components/spinner";
import { FormField } from "@/components/form-field";
import { ServerError } from "@/components/server-error";

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
        password: z.string().min(8, t("errorPasswordLength")),
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
      <div className="flex flex-col gap-5">
        <div className="w-10 h-10 bg-black flex items-center justify-center shrink-0">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 10l4.5 4.5L16 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {t("successTitle")}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            {t("successMessage")}
          </p>
        </div>
        <Link
          href="/login"
          className="text-sm text-black font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black self-start"
        >
          {t("backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="text-black font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="John…"
              className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
              {...register("firstName")}
            />
          </FormField>
          <FormField
            id="lastName"
            label={t("lastName")}
            error={errors.lastName?.message}
          >
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Doe…"
              className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
              {...register("lastName")}
            />
          </FormField>
        </div>

        <FormField id="email" label={t("email")} error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com…"
            className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
            {...register("email")}
          />
        </FormField>

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
    </>
  );
}
