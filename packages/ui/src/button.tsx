import type { ComponentProps } from "react";
import { cn } from "./cn";
import { Spinner } from "./spinner";

const variants = {
  primary: "bg-foreground text-white hover:bg-neutral-800",
  secondary:
    "border border-border-strong bg-white text-foreground hover:border-foreground",
  ghost: "text-foreground hover:bg-surface",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "h-8 px-3 text-caption",
  md: "h-10 px-4 text-small",
  lg: "h-12 px-6 text-small",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  fullWidth?: boolean;
};

export function Button({
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const onDark = variant === "primary" || variant === "danger";
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && <Spinner size="xs" variant={onDark ? "white" : "neutral"} />}
      {children}
    </button>
  );
}
