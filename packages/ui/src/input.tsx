import type { ComponentProps } from "react";
import { cn } from "./cn";

type FieldProps = { invalid?: boolean };

export function fieldClass(invalid?: boolean, className?: string) {
  return cn(
    "w-full border bg-white px-3 text-small text-foreground placeholder:text-neutral-400 transition-colors",
    "focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-1 focus-visible:ring-foreground",
    "disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted",
    invalid ? "border-red-500" : "border-border-strong",
    className,
  );
}

export function Input({
  invalid,
  className,
  ...props
}: ComponentProps<"input"> & FieldProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={fieldClass(invalid, cn("h-10", className))}
      {...props}
    />
  );
}

export function Select({
  invalid,
  className,
  ...props
}: ComponentProps<"select"> & FieldProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={fieldClass(invalid, cn("h-10", className))}
      {...props}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...props
}: ComponentProps<"textarea"> & FieldProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={fieldClass(invalid, cn("py-2.5", className))}
      {...props}
    />
  );
}
