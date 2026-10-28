import type { ReactNode } from "react";
import { cn } from "./cn";

const variants = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-green-200 bg-green-50 text-green-800",
};

export function Alert({
  variant = "error",
  className,
  children,
}: {
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
}) {
  const isError = variant === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "border px-3 py-2.5 text-small",
        variants[variant],
        className,
      )}
    >
      {children}
    </p>
  );
}
