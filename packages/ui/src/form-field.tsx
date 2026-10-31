import { cloneElement, isValidElement, type ReactNode } from "react";
import { cn } from "./cn";

export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const errorId = id && error ? `${id}-error` : undefined;
  const hintId = id && !error && hint ? `${id}-hint` : undefined;
  const describedBy = errorId ?? hintId;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label uppercase text-muted">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {describedBy && isValidElement<{ "aria-describedby"?: string }>(children)
        ? cloneElement(children, { "aria-describedby": describedBy })
        : children}
      {error ? (
        <span id={errorId} role="alert" className="text-caption text-red-600">
          {error}
        </span>
      ) : (
        hint && (
          <span id={hintId} className="text-caption text-muted">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
