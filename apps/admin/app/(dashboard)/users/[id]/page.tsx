"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser } from "@repo/types";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Spinner } from "@repo/ui/spinner";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AdminUser>(`/api/v1/users/${id}`)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-small text-muted">
        <Spinner variant="neutral" />
        Loading…
      </div>
    );
  if (!user) return <Alert>User not found</Alert>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-small text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back to Users
        </button>
        <Button onClick={() => router.push(`/users/${id}/edit`)}>
          <Pencil size={16} aria-hidden="true" /> Edit
        </Button>
      </div>

      <div className="bg-background border border-border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="size-14 bg-foreground text-background flex items-center justify-center text-h3">
            {user.firstName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-h2">
              {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
            </h1>
            <p className="mt-1 text-small text-muted">{user.email}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-border border border-border">
          {(
            [
              ["Role", user.roles?.[0]?.name ?? "user"],
              ["Status", user.status ?? "unknown"],
              ["Joined", new Date(user.createdAt).toLocaleDateString()],
              ["Updated", new Date(user.updatedAt).toLocaleDateString()],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="bg-background px-4 py-3">
              <dt className="text-label uppercase text-muted">{label}</dt>
              <dd className="mt-1 text-small font-medium capitalize tabular-nums">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
