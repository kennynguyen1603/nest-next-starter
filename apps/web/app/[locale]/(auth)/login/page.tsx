"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/lib/navigation";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { buildOAuthUrl } from "@/lib/oauth";
import type { OAuthProvider } from "@/lib/oauth";

type FormValues = {
  email: string;
  password: string;
};

const OAUTH_PROVIDERS: {
  id: OAuthProvider;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
          fill="#4285F4"
        />
        <path
          d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
          fill="#34A853"
        />
        <path
          d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
          fill="#FBBC05"
        />
        <path
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M18 9a9 9 0 1 0-10.406 8.892V11.61H5.31V9h2.284V7.017c0-2.255 1.343-3.502 3.4-3.502.985 0 2.015.175 2.015.175v2.215h-1.135c-1.118 0-1.467.694-1.467 1.406V9h2.496l-.399 2.61h-2.097v6.282A9.004 9.004 0 0 0 18 9Z"
          fill="#1877F2"
        />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M9 0C4.027 0 0 4.027 0 9a9.003 9.003 0 0 0 6.155 8.554c.45.082.615-.195.615-.434 0-.214-.008-.782-.012-1.534-2.504.544-3.032-1.207-3.032-1.207-.409-1.039-1-1.316-1-1.316-.818-.559.062-.548.062-.548.904.064 1.38.929 1.38.929.803 1.376 2.107.979 2.62.748.082-.582.314-.979.572-1.203-2-.227-4.103-1-4.103-4.453 0-.983.351-1.787.928-2.417-.093-.228-.403-1.143.088-2.382 0 0 .756-.242 2.477.923A8.62 8.62 0 0 1 9 4.36c.766.004 1.538.104 2.26.304 1.72-1.165 2.476-.923 2.476-.923.491 1.24.181 2.154.089 2.382.577.63.927 1.434.927 2.417 0 3.462-2.107 4.224-4.114 4.447.323.279.611.827.611 1.667 0 1.203-.011 2.174-.011 2.47 0 .241.162.52.618.433A9.003 9.003 0 0 0 18 9C18 4.027 13.973 0 9 0Z"
        />
      </svg>
    ),
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9.294 6.928 14.357 1h-1.2L8.762 6.147 5.25 1H1l5.31 7.784L1 15.5h1.2l4.642-5.436 3.708 5.436H15L9.294 6.928ZM7.48 9.34l-.538-.775L2.64 1.924h1.843l3.457 4.981.538.775 4.491 6.47h-1.843L7.48 9.34Z" />
      </svg>
    ),
  },
];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState("");
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const t = useTranslations("auth.login");

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("errorInvalidEmail")),
        password: z.string().min(8, t("errorPasswordLength")),
      }),
    [t],
  );

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setServerError(decodeURIComponent(error).replace(/_/g, " "));
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      const data = await api.post<{
        token: string;
        tokenExpires: number;
        user: import("@/lib/auth-store").AuthUser;
      }>("/api/v1/auth/email/login", values);
      setAuth(data.token, data.tokenExpires, data.user);
      router.push("/");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : t("errorDefault"),
      );
    }
  }

  async function handleOAuth(provider: OAuthProvider) {
    setOauthLoading(provider);
    setServerError("");
    try {
      const url = await buildOAuthUrl(provider);
      window.location.href = url;
    } catch {
      setServerError(t("errorGeneric"));
      setOauthLoading(null);
    }
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="text-black font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            {t("createOne")}
          </Link>
        </p>
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
            autoComplete="current-password"
            placeholder="••••••••"
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

      <div className="flex items-center gap-3 my-7">
        <div className="flex-1 h-px bg-[#E8E8E8]" />
        <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
          {t("orContinueWith")}
        </span>
        <div className="flex-1 h-px bg-[#E8E8E8]" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {OAUTH_PROVIDERS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            disabled={oauthLoading !== null}
            onClick={() => handleOAuth(id)}
            className="flex items-center justify-center gap-2.5 border border-[#D0D0D0] px-4 py-3.5 text-sm font-medium hover:bg-neutral-50 hover:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
          >
            {oauthLoading === id ? (
              <span className="w-4 h-4 border-2 border-black/20 border-t-black/70 animate-spin rounded-full shrink-0" />
            ) : (
              icon
            )}
            <span>{oauthLoading === id ? t("oauthOpening") : label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}
