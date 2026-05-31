type SpinnerSize = "xs" | "sm" | "md" | "lg";
type SpinnerVariant = "dark" | "white" | "neutral";

interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

const sizes: Record<SpinnerSize, string> = {
  xs: "w-3.5 h-3.5",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const variants: Record<SpinnerVariant, string> = {
  dark: "border-black border-t-transparent",
  white: "border-white/30 border-t-white",
  neutral: "border-neutral-300 border-t-black",
};

export function Spinner({
  size = "sm",
  variant = "dark",
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      className={`inline-block shrink-0 border-2 animate-spin rounded-[9999px] ${sizes[size]} ${variants[variant]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
