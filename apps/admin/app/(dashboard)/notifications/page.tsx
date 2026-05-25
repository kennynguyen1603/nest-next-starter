"use client";

import { useCallback, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  Clock,
  Megaphone,
  Send,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";

const NOTIFICATIONS_ENABLED =
  process.env.NEXT_PUBLIC_NOTIFICATIONS_ENABLED === "true";

// ─── Shared schema helpers ────────────────────────────────────────────────────

const baseSchema = {
  type: z.enum(["system"]),
  title: z.string().min(1, "Title is required").max(255, "Max 255 characters"),
  message: z.string().min(1, "Message is required"),
  data: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Must be valid JSON" },
    ),
};

const singleSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  ...baseSchema,
});

const broadcastSchema = z.object(baseSchema);

type SingleFormData = z.infer<typeof singleSchema>;
type BroadcastFormData = z.infer<typeof broadcastSchema>;

// ─── Sent history entry ───────────────────────────────────────────────────────

interface SentEntry {
  id: string;
  target: string;
  title: string;
  sentAt: string;
}

// ─── Reusable fields ──────────────────────────────────────────────────────────

function parseData(raw?: string): Record<string, unknown> | undefined {
  if (!raw?.trim()) return undefined;
  return JSON.parse(raw) as Record<string, unknown>;
}

// ─── Feature-disabled screen ──────────────────────────────────────────────────

function FeatureDisabled() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
      <div className="flex gap-4 rounded-xl border border-amber-200 bg-amber-50 p-6">
        <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-500" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-800">Feature disabled</p>
          <p className="text-sm text-amber-700">
            The notification module is currently disabled. Set the following
            environment variables and restart both services to enable it:
          </p>
          <pre className="mt-1 rounded bg-amber-100 px-3 py-2 font-mono text-xs text-amber-900">
            {`# apps/api/.env\nNOTIFICATIONS_ENABLED=true\n\n# apps/admin/.env.local\nNEXT_PUBLIC_NOTIFICATIONS_ENABLED=true`}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ─── Shared form fields component ────────────────────────────────────────────

interface BaseFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  errors: Partial<Record<string, { message?: string }>>;
}

function BaseFields({ register, errors }: BaseFieldsProps) {
  return (
    <>
      {/* Type */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Type <span className="text-red-500">*</span>
        </label>
        <select
          {...register("type")}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <option value="system">System</option>
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          {...register("title")}
          placeholder="Welcome to the platform"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register("message")}
          rows={3}
          placeholder="Your account has been set up successfully."
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        {errors.message && (
          <p className="mt-1 text-xs text-red-600">{errors.message.message}</p>
        )}
      </div>

      {/* Extra data */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Extra data{" "}
          <span className="font-normal text-gray-400">(optional JSON)</span>
        </label>
        <textarea
          {...register("data")}
          rows={3}
          placeholder={'{ "link": "/dashboard" }'}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        {errors.data && (
          <p className="mt-1 text-xs text-red-600">{errors.data.message}</p>
        )}
      </div>
    </>
  );
}

// ─── Single-user tab ──────────────────────────────────────────────────────────

function SingleTab({ onSent }: { onSent: (entry: SentEntry) => void }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SingleFormData>({
    resolver: zodResolver(singleSchema),
    defaultValues: { type: "system" },
  });

  const onSubmit = useCallback(
    async (data: SingleFormData) => {
      setSubmitError(null);
      try {
        const notification = await api.post<{
          id: string;
          userId: string;
          title: string;
        }>("/api/v1/notifications", {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: parseData(data.data),
        });
        onSent({
          id: notification.id,
          target: notification.userId,
          title: notification.title,
          sentAt: new Date().toISOString(),
        });
        reset({ type: "system" });
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to send");
      }
    },
    [reset, onSent],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          User ID <span className="text-red-500">*</span>
        </label>
        <input
          {...register("userId")}
          placeholder="6a11a4f5f8c013f044fe3299"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        />
        {errors.userId && (
          <p className="mt-1 text-xs text-red-600">{errors.userId.message}</p>
        )}
      </div>

      <BaseFields register={register} errors={errors} />

      {submitError && <ErrorBanner message={submitError} />}

      <SubmitButton
        loading={isSubmitting}
        label="Send notification"
        icon={<Send size={14} />}
      />
    </form>
  );
}

// ─── Broadcast tab ────────────────────────────────────────────────────────────

function BroadcastTab({ onSent }: { onSent: (entry: SentEntry) => void }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { type: "system" },
  });

  const send = useCallback(
    async (data: BroadcastFormData) => {
      setSubmitError(null);
      setConfirming(false);
      try {
        const result = await api.post<{ count: number }>(
          "/api/v1/notifications/broadcast",
          {
            type: data.type,
            title: data.title,
            message: data.message,
            data: parseData(data.data),
          },
        );
        onSent({
          id: crypto.randomUUID(),
          target: `${result.count} users`,
          title: data.title,
          sentAt: new Date().toISOString(),
        });
        reset({ type: "system" });
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "Failed to broadcast",
        );
      }
    },
    [reset, onSent],
  );

  const onSubmit = useCallback(
    async (data: BroadcastFormData) => {
      if (!confirming) {
        setConfirming(true);
        return;
      }
      await send(data);
    },
    [confirming, send],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
        <Users size={15} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700">
          This notification will be sent to <strong>every user</strong> in the
          system. Use with care.
        </p>
      </div>

      <BaseFields register={register} errors={errors} />

      {submitError && <ErrorBanner message={submitError} />}

      {confirming && !isSubmitting && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1 text-xs text-amber-700">
            <p className="font-medium">Confirm broadcast</p>
            <p className="mt-0.5">
              &ldquo;{getValues("title")}&rdquo; will be sent to all users.
              Click again to confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="shrink-0 text-xs text-amber-600 underline hover:text-amber-800"
          >
            Cancel
          </button>
        </div>
      )}

      <SubmitButton
        loading={isSubmitting}
        label={
          confirming ? "Confirm — send to all users" : "Broadcast to all users"
        }
        icon={<Megaphone size={14} />}
        danger={confirming}
      />
    </form>
  );
}

// ─── Small shared UI atoms ────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <AlertCircle size={15} className="shrink-0 text-red-500" />
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}

function SubmitButton({
  loading,
  label,
  icon,
  danger = false,
}: {
  loading: boolean;
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        danger
          ? "bg-amber-600 hover:bg-amber-700"
          : "bg-indigo-600 hover:bg-indigo-700"
      }`}
    >
      {icon}
      {loading ? "Sending…" : label}
    </button>
  );
}

// ─── Sent history list ────────────────────────────────────────────────────────

function SentHistory({ entries }: { entries: SentEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Sent this session
        </h2>
      </div>
      <ul className="divide-y divide-gray-100">
        {entries.map((n) => (
          <li key={n.id} className="flex items-start gap-3 px-5 py-4">
            <CheckCircle size={16} className="mt-0.5 shrink-0 text-green-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {n.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                → {n.target}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
              <Clock size={12} />
              {new Date(n.sentAt).toLocaleTimeString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "single" | "broadcast";

function NotificationsMain() {
  const [tab, setTab] = useState<Tab>("single");
  const [sent, setSent] = useState<SentEntry[]>([]);

  const addSent = useCallback((entry: SentEntry) => {
    setSent((prev) => [entry, ...prev]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bell size={20} className="text-indigo-500" />
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 w-fit">
        <TabButton
          active={tab === "single"}
          onClick={() => setTab("single")}
          icon={<Send size={14} />}
          label="Single user"
        />
        <TabButton
          active={tab === "broadcast"}
          onClick={() => setTab("broadcast")}
          icon={<Megaphone size={14} />}
          label="Broadcast to all"
        />
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {tab === "single" ? (
          <SingleTab onSent={addSent} />
        ) : (
          <BroadcastTab onSent={addSent} />
        )}
      </div>

      <SentHistory entries={sent} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
        active
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function NotificationsPage() {
  if (!NOTIFICATIONS_ENABLED) return <FeatureDisabled />;
  return <NotificationsMain />;
}
