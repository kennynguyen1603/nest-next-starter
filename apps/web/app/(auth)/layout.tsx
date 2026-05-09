export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[480px_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-black text-white p-12">
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400">
          Starter
        </span>
        <div>
          <p className="text-[2rem] font-semibold leading-tight tracking-tight [text-wrap:balance]">
            The modern platform
            <br />
            for your next project.
          </p>
          <p className="mt-4 text-sm text-neutral-500 leading-relaxed max-w-xs">
            Ship faster with a pre-configured stack — NestJS, Next.js,
            PostgreSQL, and full authentication out of the box.
          </p>
        </div>
        <p className="text-xs text-neutral-700">© 2026 Starter</p>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-white px-6 py-20">
        <div className="w-full max-w-110">
          <div className="lg:hidden mb-10">
            <span className="text-xs font-semibold tracking-[0.2em] uppercase text-neutral-400">
              Starter
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
