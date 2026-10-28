import { useTranslations } from "next-intl";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("auth.layout");

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[480px_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-foreground text-background p-12">
        <span className="text-label uppercase text-white/50">Starter</span>
        <div>
          <p className="text-display text-balance whitespace-pre-line">
            {t("tagline")}
          </p>
          <p className="mt-4 max-w-xs text-small text-white/50">
            {t("description")}
          </p>
        </div>
        <p className="text-caption text-white/40">{t("copyright")}</p>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-20">
        <div className="w-full max-w-110">
          <div className="lg:hidden mb-10">
            <span className="text-label uppercase text-muted">Starter</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
