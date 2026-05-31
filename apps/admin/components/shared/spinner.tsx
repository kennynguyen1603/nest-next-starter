type SpinnerSize = "sm" | "md";
type SpinnerVariant = "white" | "gray";

interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
}

const sizes: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
};

const variants: Record<SpinnerVariant, string> = {
  white: "border-white/30 border-t-white",
  gray: "border-gray-300 border-t-gray-600",
};

export function Spinner({
  size = "sm",
  variant = "gray",
  className,
  ...props
}: SpinnerProps) {
  return (
    <span
      className={`inline-block shrink-0 border-2 animate-spin rounded-full ${sizes[size]} ${variants[variant]}${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
