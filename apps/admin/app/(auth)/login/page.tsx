"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { isAdmin, revokeSession } from "@/lib/api";
import type { AuthUser } from "@repo/types";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { FormField } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";

const schema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setServerError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/email/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        setServerError(body?.message ?? "Login failed");
        return;
      }

      const { token, tokenExpires, user } = (await res.json()) as {
        token: string;
        tokenExpires: number;
        user: AuthUser;
      };

      if (!isAdmin(user)) {
        await revokeSession();
        setServerError("Access denied. Admin role required.");
        return;
      }

      setAuth(token, tokenExpires, user);
      router.push("/");
    } catch (e) {
      setServerError(e instanceof Error ? e.message : "Login failed");
    }
  }

  return (
    <div className="w-full max-w-sm border border-border bg-white p-8">
      <div className="mb-8">
        <div className="mb-6 size-8 bg-foreground" aria-hidden="true" />
        <h1 className="text-h2">Admin Login</h1>
        <p className="mt-1 text-small text-muted">
          Sign in to access the admin panel
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="admin@example.com"
            autoComplete="email"
            spellCheck={false}
            invalid={!!errors.email}
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
        >
          <Input
            id="password"
            type="password"
            {...register("password")}
            placeholder="••••••••"
            autoComplete="current-password"
            spellCheck={false}
            autoCorrect="off"
            invalid={!!errors.password}
          />
        </FormField>

        {serverError && <Alert>{serverError}</Alert>}

        <Button type="submit" fullWidth loading={isSubmitting} className="mt-1">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
