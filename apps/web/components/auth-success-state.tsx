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
        <div className="mb-6 flex size-10 items-center justify-center bg-foreground">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 10l4.5 4.5L16 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="square"
            />
          </svg>
        </div>
        <h1 className="text-h1">{title}</h1>
        <p className="mt-2 text-small text-muted">{message}</p>
      </div>
      <Link
        href="/login"
        className="text-small font-medium underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        {backLabel}
      </Link>
    </>
  );
}
