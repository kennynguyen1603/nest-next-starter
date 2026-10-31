"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { FormField } from "@repo/ui/form-field";
import { Input, Select } from "@repo/ui/input";
import type { AdminUser } from "@repo/types";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .optional()
    .refine((v) => !v || v.length >= 8, {
      message: "Password must be at least 8 characters",
    }),
  role: z.enum(["user", "manager", "admin"]),
  status: z.enum(["active", "inactive", "pending", "banned"]),
});

type FormData = z.infer<typeof schema>;

interface FieldError {
  property?: string;
  message?: string;
}

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isLoading },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    api
      .get<AdminUser>(`/api/v1/users/${id}`)
      .then((user) => {
        reset({
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email ?? "",
          password: "",
          role: (user.roles?.[0]?.name as FormData["role"]) ?? "user",
          status: (user.status as FormData["status"]) ?? "active",
        });
      })
      .catch(() => setLoadError("Could not load user data."));
  }, [id, reset]);

  const onSubmit = useCallback(
    async (data: FormData) => {
      setServerError(null);
      try {
        const body: Record<string, unknown> = {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          roles: [{ name: data.role }],
          status: data.status,
        };
        if (data.password) body.password = data.password;

        await api.patch(`/api/v1/users/${id}`, body);
        router.push(`/users/${id}`);
      } catch (err) {
        if (err instanceof Error) {
          const raw = (err as Error & { details?: FieldError[] }).details;
          if (raw?.length) {
            raw.forEach(({ property, message }) => {
              if (
                property &&
                message &&
                ["firstName", "lastName", "email", "password"].includes(
                  property,
                )
              ) {
                setError(property as keyof FormData, { message });
              }
            });
            return;
          }
          setServerError(err.message);
        } else {
          setServerError("Failed to update user. Please try again.");
        }
      }
    },
    [id, router, setError],
  );

  if (loadError) {
    return (
      <div className="max-w-2xl">
        <Alert>{loadError}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-small text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Back
        </button>
      </div>

      <div className="bg-background border border-border p-6">
        <h1 className="text-h2 mb-6">Edit user</h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="firstName"
              label="First name"
              error={errors.firstName?.message}
              required
            >
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
                disabled={isLoading}
                invalid={!!errors.firstName}
              />
            </FormField>
            <FormField
              id="lastName"
              label="Last name"
              error={errors.lastName?.message}
              required
            >
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Doe"
                disabled={isLoading}
                invalid={!!errors.lastName}
              />
            </FormField>
          </div>

          <FormField
            id="email"
            label="Email"
            error={errors.email?.message}
            required
          >
            <Input
              id="email"
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              disabled={isLoading}
              invalid={!!errors.email}
            />
          </FormField>

          <FormField
            id="password"
            label="New password"
            error={errors.password?.message}
            hint="Leave blank to keep current password"
          >
            <Input
              id="password"
              {...register("password")}
              type="password"
              placeholder="Min. 8 characters"
              disabled={isLoading}
              invalid={!!errors.password}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="role" label="Role" error={errors.role?.message}>
              <Select
                id="role"
                {...register("role")}
                disabled={isLoading}
                invalid={!!errors.role}
              >
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </Select>
            </FormField>
            <FormField
              id="status"
              label="Status"
              error={errors.status?.message}
            >
              <Select
                id="status"
                {...register("status")}
                disabled={isLoading}
                invalid={!!errors.status}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="banned">Banned</option>
              </Select>
            </FormField>
          </div>

          {serverError && <Alert>{serverError}</Alert>}

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={isSubmitting} disabled={isLoading}>
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
