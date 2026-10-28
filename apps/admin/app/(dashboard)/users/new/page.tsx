"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { FormField } from "@repo/ui/form-field";
import { Input, Select } from "@repo/ui/input";

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
              id="firstName"
              label="First name"
              error={errors.firstName?.message}
              required
            >
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
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
              invalid={!!errors.email}
            />
          </FormField>

          <FormField
            id="password"
            label="Password"
            error={errors.password?.message}
            required
          >
            <Input
              id="password"
              {...register("password")}
              type="password"
              placeholder="Min. 8 characters"
              invalid={!!errors.password}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="role" label="Role" error={errors.role?.message}>
              <Select id="role" {...register("role")} invalid={!!errors.role}>
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
            <Button type="submit" loading={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create user"}
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
