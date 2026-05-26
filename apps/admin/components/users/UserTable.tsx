"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { AdminUser } from "@repo/types";
import { api } from "@/lib/api";
import ConfirmModal from "@/components/shared/ConfirmModal";

interface Props {
  users: AdminUser[];
  onRefresh: () => void;
}

const STATUS_OPTIONS = ["active", "inactive", "pending", "banned"] as const;
const ROLE_OPTIONS = ["user", "manager", "admin"] as const;

type BulkAction = "delete" | "status" | "role";

export default function UserTable({ users, onRefresh }: Props) {
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
  const [bulkError, setBulkError] = useState<string | null>(null);

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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkAction(null);
    setBulkError(null);
  }

  // ─── Single delete ────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/users/${deleteTarget}`);
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ─── Bulk actions ─────────────────────────────────────────────────────────────

  async function executeBulkDelete() {
    setBulkWorking(true);
    setBulkError(null);
    try {
      await Promise.all(
        [...selected].map((id) => api.delete(`/api/v1/users/${id}`)),
      );
      clearSelection();
      onRefresh();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setBulkWorking(false);
      setBulkAction(null);
    }
  }

  async function executeBulkStatus() {
    setBulkWorking(true);
    setBulkError(null);
    try {
      await Promise.all(
        [...selected].map((id) =>
          api.patch(`/api/v1/users/${id}`, { status: bulkStatus }),
        ),
      );
      clearSelection();
      onRefresh();
    } catch (e) {
      setBulkError(
        e instanceof Error ? e.message : "Bulk status update failed",
      );
    } finally {
      setBulkWorking(false);
    }
  }

  async function executeBulkRole() {
    setBulkWorking(true);
    setBulkError(null);
    try {
      await Promise.all(
        [...selected].map((id) =>
          api.patch(`/api/v1/users/${id}`, {
            roles: [{ name: bulkRole }],
          }),
        ),
      );
      clearSelection();
      onRefresh();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "Bulk role update failed");
    } finally {
      setBulkWorking(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
          <span className="font-medium text-indigo-700 shrink-0">
            {selected.size} selected
          </span>

          {/* Change status */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={executeBulkStatus}
              disabled={bulkWorking}
              className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Set status
            </button>
          </div>

          {/* Change role */}
          <div className="flex items-center gap-1.5">
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={executeBulkRole}
              disabled={bulkWorking}
              className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Set role
            </button>
          </div>

          {/* Delete */}
          <button
            onClick={() => setBulkAction("delete")}
            disabled={bulkWorking}
            className="px-2.5 py-1 bg-white border border-red-300 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Delete selected
          </button>

          {bulkError && (
            <span className="text-red-600 text-xs">{bulkError}</span>
          )}

          <button
            onClick={clearSelection}
            className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  aria-label="Select all"
                />
              </th>
              {["Name", "Email", "Role", "Status", "Joined", ""].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 font-medium text-gray-600"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            )}
            {users.map((user) => {
              const isSelected = selected.has(user.id);
              return (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 ${isSelected ? "bg-indigo-50/50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(user.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label={`Select ${user.email ?? user.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {[user.firstName, user.lastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {user.roles?.[0]?.name ?? "user"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.status ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => router.push(`/users/${user.id}`)}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => router.push(`/users/${user.id}/edit`)}
                        className="p-1.5 text-gray-400 hover:text-amber-600 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(user.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
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
