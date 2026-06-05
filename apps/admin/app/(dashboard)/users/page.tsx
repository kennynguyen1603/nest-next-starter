"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UserTable from "@/components/users/UserTable";
import type { AdminUser } from "@repo/types";
import { Spinner } from "@/components/shared/spinner";

interface UsersApiResponse {
  data: AdminUser[];
  pagination: {
    currentPage: number;
    totalRecords: number;
    totalPages: number;
    limit: number;
  };
}

const LIMIT = 20;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loading, setLoading] = useState(true);

  // Debounce the raw input into the term we actually query with. Keeping these
  // separate means fetchUsers' identity is stable while typing, so the (memoized)
  // table doesn't re-render on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (debouncedQ) params.set("q", debouncedQ);
      const data = await api.get<UsersApiResponse>(
        `/api/v1/users?${params.toString()}`,
      );
      setUsers(data.data);
      setTotal(data.pagination.totalRecords);
    } catch {
      // 401 handled by api.ts
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{total} total</span>
          <button
            onClick={() => router.push("/users/new")}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <UserPlus size={15} />
            New User
          </button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users…"
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-gray-400">
          <Spinner />
          Loading…
        </div>
      ) : (
        <UserTable users={users} onRefresh={fetchUsers} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
