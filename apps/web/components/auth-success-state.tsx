import { Link } from "@/lib/navigation";

interface AuthSuccessStateProps {
  title: string;
  message: string;
  backLabel: string;
}

export function AuthSuccessState({
  title,
  message,
  backLabel,
}: AuthSuccessStateProps) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-neutral-500">{message}</p>
      </div>
      <Link
        href="/login"
        className="text-sm font-medium underline underline-offset-2 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
      >
        {backLabel}
      </Link>
    </>
  );
}
