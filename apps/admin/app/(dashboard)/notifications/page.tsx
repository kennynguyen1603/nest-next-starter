"use client";

import { useCallback, useState } from "react";
import { useForm, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Megaphone,
  Send,
  Users,
} from "lucide-react";
import { Alert } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { FormField } from "@repo/ui/form-field";
import { Input, Select, Textarea } from "@repo/ui/input";
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
      <h1 className="text-h2">Notifications</h1>
      <div className="flex gap-4 border border-amber-200 bg-amber-50 p-6">
        <AlertCircle
          size={20}
          className="mt-0.5 shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <p className="text-small font-medium text-amber-900">
            Feature disabled
          </p>
          <p className="text-small text-amber-800">
            The notification module is currently disabled. Set the following
            environment variables and restart both services to enable it:
          </p>
          <pre className="mt-1 bg-amber-100 px-3 py-2 font-mono text-caption text-amber-900">
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
      <FormField id="type" label="Type" required>
        <Select id="type" {...register("type")}>
          <option value="system">System</option>
        </Select>
      </FormField>

      <FormField
        id="title"
        label="Title"
        required
        error={errors.title?.message}
      >
        <Input
          id="title"
          placeholder="Welcome to the platform"
          invalid={!!errors.title}
          {...register("title")}
        />
      </FormField>

      <FormField
        id="message"
        label="Message"
        required
        error={errors.message?.message}
      >
        <Textarea
          id="message"
          rows={3}
          placeholder="Your account has been set up successfully."
          invalid={!!errors.message}
          className="resize-none"
          {...register("message")}
        />
      </FormField>

      <FormField
        id="data"
        label="Extra data"
        hint="Optional JSON"
        error={errors.data?.message}
      >
        <Textarea
          id="data"
          rows={3}
          placeholder={'{ "link": "/dashboard" }'}
          invalid={!!errors.data}
          className="resize-none font-mono"
          {...register("data")}
        />
      </FormField>
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
      <FormField
        id="userId"
        label="User ID"
        required
        error={errors.userId?.message}
      >
        <Input
          id="userId"
          placeholder="6a11a4f5f8c013f044fe3299"
          invalid={!!errors.userId}
          {...register("userId")}
        />
      </FormField>

      <BaseFields register={register} errors={errors} />

      {submitError && <Alert>{submitError}</Alert>}

      <Button type="submit" loading={isSubmitting}>
        {!isSubmitting && <Send size={14} aria-hidden="true" />}
        {isSubmitting ? "Sending…" : "Send notification"}
      </Button>
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
      <div className="flex items-start gap-2 border border-border bg-surface px-3 py-2.5">
        <Users
          size={15}
          className="mt-0.5 shrink-0 text-muted"
          aria-hidden="true"
        />
        <p className="text-caption text-muted">
          This notification will be sent to <strong>every user</strong> in the
          system. Use with care.
        </p>
      </div>

      <BaseFields register={register} errors={errors} />

      {submitError && <Alert>{submitError}</Alert>}

      {confirming && !isSubmitting && (
        <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertCircle
            size={15}
            className="mt-0.5 shrink-0 text-amber-600"
            aria-hidden="true"
          />
          <div className="flex-1 text-caption text-amber-800">
            <p className="font-medium">Confirm broadcast</p>
            <p className="mt-0.5">
              &ldquo;{getValues("title")}&rdquo; will be sent to all users.
              Click again to confirm.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="shrink-0 text-caption text-amber-800 underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      <Button
        type="submit"
        variant={confirming ? "danger" : "primary"}
        loading={isSubmitting}
      >
        {!isSubmitting && <Megaphone size={14} aria-hidden="true" />}
        {isSubmitting
          ? "Sending…"
          : confirming
            ? "Confirm — send to all users"
            : "Broadcast to all users"}
      </Button>
    </form>
  );
}

// ─── Sent history list ────────────────────────────────────────────────────────

function SentHistory({ entries }: { entries: SentEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="border border-border bg-background">
      <h2 className="border-b border-border px-5 py-4 text-label uppercase text-muted">
        Sent this session
      </h2>
      <ul className="divide-y divide-border">
        {entries.map((n) => (
          <li key={n.id} className="flex items-start gap-3 px-5 py-4">
            <CheckCircle
              size={16}
              className="mt-0.5 shrink-0 text-green-600"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-small font-medium">{n.title}</p>
              <p className="mt-0.5 truncate text-caption text-muted">
                → {n.target}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-caption text-muted tabular-nums">
              <Clock size={12} aria-hidden="true" />
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
      <div>
        <h1 className="text-h2">Notifications</h1>
        <p className="mt-1 text-small text-muted">
          Send a notification to one user or broadcast to everyone.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex w-fit border border-border">
        <TabButton
          active={tab === "single"}
          onClick={() => setTab("single")}
          icon={<Send size={14} aria-hidden="true" />}
          label="Single user"
        />
        <TabButton
          active={tab === "broadcast"}
          onClick={() => setTab("broadcast")}
          icon={<Megaphone size={14} aria-hidden="true" />}
          label="Broadcast to all"
        />
      </div>

      {/* Form card */}
      <div className="border border-border bg-background p-6">
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
      aria-pressed={active}
      className={`flex h-9 items-center gap-2 px-4 text-small font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground ${
        active
          ? "bg-foreground text-background"
          : "text-muted hover:text-foreground"
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
