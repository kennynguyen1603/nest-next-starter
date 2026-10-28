import type { ComponentProps } from "react";
import { cn } from "./cn";

const sizes = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
};

const variants = {
  dark: "border-foreground border-t-transparent",
  white: "border-white/30 border-t-white",
  neutral: "border-border-strong border-t-foreground",
};

export function Spinner({
  size = "sm",
  variant = "dark",
  className,
  ...props
}: ComponentProps<"span"> & {
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
}) {
  return (
    <span
      aria-hidden={props["aria-label"] ? undefined : true}
      className={cn(
        "inline-block shrink-0 animate-spin border-2",
        sizes[size],
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
