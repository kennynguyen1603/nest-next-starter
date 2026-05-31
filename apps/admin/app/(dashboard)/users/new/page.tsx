"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { FormField, inputCls } from "@/components/shared/form-field";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "manager", "admin"]),
  status: z.enum(["active", "inactive", "pending", "banned"]),
});

type FormData = z.infer<typeof schema>;

interface FieldError {
  property?: string;
  message?: string;
}

export default function NewUserPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "user", status: "active" },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      setServerError(null);
      try {
        await api.post("/api/v1/users", {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          roles: [{ name: data.role }],
          status: data.status,
        });
        router.push("/users");
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
          setServerError("Failed to create user. Please try again.");
        }
      }
    },
    [router, setError],
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Users
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">
          Create new user
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="First name"
              error={errors.firstName?.message}
              required
            >
              <input
                {...register("firstName")}
                placeholder="John"
                className={inputCls(!!errors.firstName)}
              />
            </FormField>
            <FormField
              label="Last name"
              error={errors.lastName?.message}
              required
            >
              <input
                {...register("lastName")}
                placeholder="Doe"
                className={inputCls(!!errors.lastName)}
              />
            </FormField>
          </div>

          <FormField label="Email" error={errors.email?.message} required>
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              className={inputCls(!!errors.email)}
            />
          </FormField>

          <FormField label="Password" error={errors.password?.message} required>
            <input
              {...register("password")}
              type="password"
              placeholder="Min. 8 characters"
              className={inputCls(!!errors.password)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Role" error={errors.role?.message}>
              <select {...register("role")} className={inputCls(!!errors.role)}>
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </FormField>
            <FormField label="Status" error={errors.status?.message}>
              <select
                {...register("status")}
                className={inputCls(!!errors.status)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="banned">Banned</option>
              </select>
            </FormField>
          </div>

          {serverError && (
            <p
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg"
            >
              {serverError}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {isSubmitting ? "Creating…" : "Create user"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
