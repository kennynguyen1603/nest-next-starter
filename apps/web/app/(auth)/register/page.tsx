"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { api } from "@/lib/api";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      await api.post("/api/v1/auth/email/register", values);
      setSuccess(true);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.",
      );
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
            Check your email
          </h2>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            We&apos;ve sent a confirmation link to your email address. Check
            your inbox and click the link to activate your account.
          </p>
        </div>
        <Link
          href="/login"
          className="text-sm text-black font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black self-start"
        >
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create account
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-black font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            Sign in
          </Link>
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="firstName"
              className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
            >
              First name
            </label>
            <input
              id="firstName"
              type="text"
              autoComplete="given-name"
              placeholder="John…"
              className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
              {...register("firstName")}
            />
            {errors.firstName && (
              <span role="alert" className="text-xs text-red-600">
                {errors.firstName.message}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="lastName"
              className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
            >
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              autoComplete="family-name"
              placeholder="Doe…"
              className="border border-[#D0D0D0] px-4 py-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
              {...register("lastName")}
            />
            {errors.lastName && (
              <span role="alert" className="text-xs text-red-600">
                {errors.lastName.message}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
          >
            Email
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
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters…"
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
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </>
  );
}
