interface ServerErrorProps {
  message: string;
}

export function ServerError({ message }: ServerErrorProps) {
  return (
    <p
      role="alert"
      aria-live="assertive"
      className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2.5"
    >
      {message}
    </p>
  );
}
