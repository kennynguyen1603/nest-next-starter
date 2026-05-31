"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { api } from "@/lib/api";
import type { AdminUser } from "@repo/types";
import { Spinner } from "@/components/shared/spinner";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AdminUser>(`/api/v1/users/${id}`)
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Spinner />
        Loading…
      </div>
    );
  if (!user) return <p className="text-sm text-red-600">User not found</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Users
        </button>
        <button
          onClick={() => router.push(`/users/${id}/edit`)}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Pencil size={15} /> Edit
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
            {user.firstName?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
            </h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          {(
            [
              ["Role", user.roles?.[0]?.name ?? "user"],
              ["Status", user.status ?? "unknown"],
              ["Joined", new Date(user.createdAt).toLocaleDateString()],
              ["Updated", new Date(user.updatedAt).toLocaleDateString()],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-900 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
