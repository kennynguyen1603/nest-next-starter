"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import UserTable from "@/components/users/UserTable";
import type { AdminUser } from "@repo/types";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Spinner } from "@repo/ui/spinner";

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
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-h2">Users</h1>
          <p className="mt-1 text-small text-muted tabular-nums">
            {total} total
          </p>
        </div>
        <Button onClick={() => router.push("/users/new")}>
          <UserPlus size={16} aria-hidden="true" />
          New User
        </Button>
      </div>

      <div className="relative max-w-xs">
        <Search
          size={16}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users…"
          aria-label="Search users"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-small text-muted">
          <Spinner variant="neutral" />
          Loading…
        </div>
      ) : (
        <UserTable users={users} onRefresh={fetchUsers} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-small text-muted">
          <span className="tabular-nums">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
