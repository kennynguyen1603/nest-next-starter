"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { api, getLocale } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Dialog } from "@repo/ui/dialog";
import { FormField } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { useAuthStore } from "@/lib/auth-store";
import type { AuthUser } from "@repo/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type FormValues = {
  firstName: string;
  lastName: string;
  oldPassword?: string;
  newPassword?: string;
};

interface Props {
  user: AuthUser;
  currentPhotoUrl: string | null;
  onClose: () => void;
}

export function EditProfileDialog({ user, currentPhotoUrl, onClose }: Props) {
  const t = useTranslations("user");
  const commonT = useTranslations("common");
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [serverError, setServerError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isOAuthUser = user.provider !== "email";

  const schema = useMemo(
    () =>
      z
        .object({
          firstName: z.string().min(1, t("errorFirstName")),
          lastName: z.string().min(1, t("errorLastName")),
          oldPassword: z.string().optional(),
          newPassword: z.string().optional(),
        })
        .refine((d) => !d.newPassword || d.newPassword.length >= 8, {
          message: t("errorPasswordLength"),
          path: ["newPassword"],
        })
        .refine(
          (d) =>
            !d.newPassword ||
            /^(?=.*[A-Za-z])(?=.*\d)[\d!#$%&*@A-Za-z^]+$/.test(d.newPassword),
          { message: t("errorPasswordComplexity"), path: ["newPassword"] },
        )
        .refine(
          (d) => !d.newPassword || d.newPassword.length < 8 || !!d.oldPassword,
          { message: t("oldPasswordRequired"), path: ["oldPassword"] },
        ),
    [t],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
    },
  });

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
  }

  async function onSubmit(values: FormValues) {
    setServerError("");
    try {
      let photoUpdate: { photo: { id: string; path: string } } | undefined;

      if (pendingFile) {
        const formData = new FormData();
        formData.append("file", pendingFile);
        const res = await fetch(`${BASE_URL}/api/v1/files/upload`, {
          method: "POST",
          credentials: "include",
          headers: {
            "x-custom-lang": getLocale(),
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: formData,
        });
        if (!res.ok) throw new Error(t("errorDefault"));
        const { file: uploaded } = await res.json();
        photoUpdate = { photo: { id: uploaded.id, path: uploaded.path } };
      }

      const body: Record<string, unknown> = {
        firstName: values.firstName,
        lastName: values.lastName,
      };
      if (values.oldPassword) body.oldPassword = values.oldPassword;
      if (values.newPassword) body.password = values.newPassword;
      if (photoUpdate) body.photo = { id: photoUpdate.photo.id };

      const updated = await api.patch<AuthUser>("/api/v1/auth/me", body);
      if (updated) {
        updateUser({
          firstName: updated.firstName,
          lastName: updated.lastName,
          ...(photoUpdate ? { photo: photoUpdate.photo } : {}),
        });
      }
      onClose();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t("errorDefault"));
    }
  }

  const displayPhoto = previewUrl ?? currentPhotoUrl;
  const initial = (user.firstName?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  return (
    <Dialog title={t("editProfile")} size="md" onClose={onClose}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
      >
        {/* Avatar preview + picker */}
        <div className="flex items-center gap-4">
          {displayPhoto ? (
            <Image
              src={displayPhoto}
              alt="Avatar"
              width={56}
              height={56}
              // Local previews are blob: URLs the optimizer can't fetch, and presigned
              // S3 URLs change on every request, so the optimizer can't cache them.
              unoptimized
              className="size-14 shrink-0 object-cover"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center bg-foreground">
              <span className="select-none text-h3 leading-none text-white">
                {initial}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="cursor-pointer border border-border-strong px-3 py-2 text-center text-caption font-medium text-foreground transition-colors hover:border-foreground focus-within:ring-1 focus-within:ring-foreground">
              {pendingFile ? pendingFile.name : t("uploadPhoto")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handlePhotoChange}
              />
            </label>
            {pendingFile && (
              <span className="text-caption text-muted">
                {t("photoWillSaveOnSubmit")}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <FormField
            id="firstName"
            label={t("firstName")}
            error={errors.firstName?.message}
            className="flex-1"
          >
            <Input
              id="firstName"
              invalid={!!errors.firstName}
              {...register("firstName")}
            />
          </FormField>
          <FormField
            id="lastName"
            label={t("lastName")}
            error={errors.lastName?.message}
            className="flex-1"
          >
            <Input
              id="lastName"
              invalid={!!errors.lastName}
              {...register("lastName")}
            />
          </FormField>
        </div>

        {!isOAuthUser && (
          <>
            <FormField
              id="oldPassword"
              label={t("oldPassword")}
              error={errors.oldPassword?.message}
            >
              <Input
                id="oldPassword"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                invalid={!!errors.oldPassword}
                {...register("oldPassword")}
              />
            </FormField>

            <FormField
              id="newPassword"
              label={t("newPassword")}
              error={errors.newPassword?.message}
            >
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder={t("newPasswordPlaceholder")}
                invalid={!!errors.newPassword}
                {...register("newPassword")}
              />
            </FormField>
          </>
        )}

        {serverError && <Alert>{serverError}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            {commonT("cancel")}
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
