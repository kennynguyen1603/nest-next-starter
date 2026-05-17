"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { api, getLocale } from "@/lib/api";
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
  const { accessToken, updateUser } = useAuthStore();
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
        .refine(
          (d) => !d.newPassword || d.newPassword.length >= 8,
          { message: t("errorPasswordLength"), path: ["newPassword"] },
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
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md shadow-xl">
        <div className="px-6 py-4 border-b border-[#E8E8E8] flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("editProfile")}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-400 hover:text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-6 py-5 flex flex-col gap-4"
          noValidate
        >
          {/* Avatar preview + picker */}
          <div className="flex items-center gap-4">
            {displayPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayPhoto}
                alt="Avatar"
                className="w-14 h-14 object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 bg-black flex items-center justify-center shrink-0">
                <span className="text-white text-lg font-semibold leading-none select-none">
                  {initial}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="cursor-pointer text-xs font-medium text-neutral-600 border border-[#D0D0D0] px-3 py-2 text-center hover:bg-neutral-50 transition-colors focus-within:ring-1 focus-within:ring-black">
                {pendingFile ? pendingFile.name : t("uploadPhoto")}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handlePhotoChange}
                />
              </label>
              {pendingFile && (
                <span className="text-[11px] text-neutral-400">
                  {t("photoWillSaveOnSubmit")}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label
                htmlFor="firstName"
                className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                {t("firstName")}
              </label>
              <input
                id="firstName"
                className="border border-[#D0D0D0] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
                {...register("firstName")}
              />
              {errors.firstName && (
                <span role="alert" className="text-xs text-red-600">
                  {errors.firstName.message}
                </span>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <label
                htmlFor="lastName"
                className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
              >
                {t("lastName")}
              </label>
              <input
                id="lastName"
                className="border border-[#D0D0D0] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
                {...register("lastName")}
              />
              {errors.lastName && (
                <span role="alert" className="text-xs text-red-600">
                  {errors.lastName.message}
                </span>
              )}
            </div>
          </div>

          {!isOAuthUser && (
            <>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="oldPassword"
                  className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  {t("oldPassword")}
                </label>
                <input
                  id="oldPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="border border-[#D0D0D0] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
                  {...register("oldPassword")}
                />
                {errors.oldPassword && (
                  <span role="alert" className="text-xs text-red-600">
                    {errors.oldPassword.message}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-xs font-medium text-neutral-500 uppercase tracking-wider"
                >
                  {t("newPassword")}
                </label>
                <input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("newPasswordPlaceholder")}
                  className="border border-[#D0D0D0] px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:border-black focus-visible:ring-1 focus-visible:ring-black"
                  {...register("newPassword")}
                />
                {errors.newPassword && (
                  <span role="alert" className="text-xs text-red-600">
                    {errors.newPassword.message}
                  </span>
                )}
              </div>
            </>
          )}

          {serverError && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5"
            >
              {serverError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-neutral-600 border border-[#D0D0D0] px-4 py-2 hover:bg-neutral-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
            >
              {commonT("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-black text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 flex items-center gap-2"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white animate-spin rounded-full shrink-0" />
              )}
              {isSubmitting ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
