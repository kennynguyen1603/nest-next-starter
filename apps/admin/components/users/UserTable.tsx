"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { AdminUser } from "@repo/types";
import { api } from "@/lib/api";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";

// Only mounted after a delete click, so keep it out of the table's bundle.
const ConfirmModal = dynamic(() => import("@/components/shared/ConfirmModal"), {
  ssr: false,
});

interface Props {
  users: AdminUser[];
  onRefresh: () => void;
}

const STATUS_OPTIONS = ["active", "inactive", "pending", "banned"] as const;
const ROLE_OPTIONS = ["user", "manager", "admin"] as const;

type BulkAction = "delete" | "status" | "role";

const SELECT_CLASS =
  "h-8 border border-border-strong bg-background px-2 text-caption focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";
const CHECKBOX_CLASS = "size-4 accent-foreground";
const ICON_BUTTON_CLASS =
  "p-1.5 text-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

function UserTable({ users, onRefresh }: Props) {
  const router = useRouter();

  // Single delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Multi-select
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>("active");
  const [bulkRole, setBulkRole] = useState<string>("user");
  const [bulkWorking, setBulkWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // A new page of users invalidates ids selected on the previous one.
  const [prevUsers, setPrevUsers] = useState(users);
  if (users !== prevUsers) {
    setPrevUsers(users);
    setSelected(new Set());
  }

  // ─── Selection helpers ────────────────────────────────────────────────────────

  const allSelected = users.length > 0 && selected.size === users.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkAction(null);
    setActionError(null);
  }

  // ─── Single delete ────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await api.delete(`/api/v1/users/${deleteTarget}`);
      onRefresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ─── Bulk actions ─────────────────────────────────────────────────────────────

  // Run a per-id action over the selection. Uses allSettled so a single failure
  // doesn't abandon the already-applied changes — we always refresh and surface
  // how many items failed instead of leaving the table in a stale, partial state.
  async function runBulk(op: (id: string) => Promise<unknown>, label: string) {
    setBulkWorking(true);
    setActionError(null);
    try {
      const ids = [...selected];
      const results = await Promise.allSettled(ids.map((id) => op(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      clearSelection();
      onRefresh();
      if (failed > 0) {
        setActionError(`${failed} of ${ids.length} ${label} failed`);
      }
    } finally {
      setBulkWorking(false);
    }
  }

  async function executeBulkDelete() {
    try {
      await runBulk((id) => api.delete(`/api/v1/users/${id}`), "deletes");
    } finally {
      setBulkAction(null);
    }
  }

  async function executeBulkStatus() {
    await runBulk(
      (id) => api.patch(`/api/v1/users/${id}`, { status: bulkStatus }),
      "status updates",
    );
  }

  async function executeBulkRole() {
    await runBulk(
      (id) => api.patch(`/api/v1/users/${id}`, { roles: [{ name: bulkRole }] }),
      "role updates",
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-background border border-foreground text-small">
          <span className="font-medium shrink-0 tabular-nums">
            {selected.size} selected
          </span>

          {/* Change status */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              aria-label="Status"
              className={SELECT_CLASS}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={executeBulkStatus}
              disabled={bulkWorking}
            >
              Set status
            </Button>
          </div>

          {/* Change role */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              aria-label="Role"
              className={SELECT_CLASS}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="sm"
              onClick={executeBulkRole}
              disabled={bulkWorking}
            >
              Set role
            </Button>
          </div>

          {/* Delete */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setBulkAction("delete")}
            disabled={bulkWorking}
          >
            Delete selected
          </Button>

          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto text-caption text-muted underline underline-offset-4 hover:text-foreground transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {actionError && <Alert>{actionError}</Alert>}

      <div className="overflow-x-auto bg-background border border-border">
        <table className="w-full text-small">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className={CHECKBOX_CLASS}
                  aria-label="Select all"
                />
              </th>
              {["Name", "Email", "Role", "Status", "Joined", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-label uppercase text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  No users found
                </td>
              </tr>
            )}
            {users.map((user) => {
              const isSelected = selected.has(user.id);
              return (
                <tr
                  key={user.id}
                  className={isSelected ? "bg-surface" : "hover:bg-surface"}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(user.id)}
                      className={CHECKBOX_CLASS}
                      aria-label={`Select ${user.email ?? user.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{user.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 border border-border text-caption font-medium capitalize">
                      {user.roles?.[0]?.name ?? "user"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-caption font-medium capitalize ${
                        user.status === "active"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-1.5 ${
                          user.status === "active"
                            ? "bg-green-600"
                            : "bg-red-600"
                        }`}
                      />
                      {user.status ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted tabular-nums">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => router.push(`/users/${user.id}`)}
                        className={ICON_BUTTON_CLASS}
                        title="View"
                        aria-label="View"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push(`/users/${user.id}/edit`)}
                        className={ICON_BUTTON_CLASS}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(user.id)}
                        className={`${ICON_BUTTON_CLASS} hover:text-red-600`}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Single delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete user?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Bulk delete confirm */}
      {bulkAction === "delete" && (
        <ConfirmModal
          title={`Delete ${selected.size} user${selected.size > 1 ? "s" : ""}?`}
          description="This action cannot be undone."
          confirmLabel="Delete all"
          onConfirm={executeBulkDelete}
          onCancel={() => setBulkAction(null)}
          loading={bulkWorking}
        />
      )}
    </>
  );
}

// Memoized so typing in the page's search box (which re-renders the parent on
// every keystroke) doesn't re-render the whole table; props are stable until a
// fetch completes.
export default memo(UserTable);
