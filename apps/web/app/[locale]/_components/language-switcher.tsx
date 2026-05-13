"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/lib/navigation";
import { SUPPORTED_LOCALES } from "@repo/types";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locale");

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.replace(pathname, { locale: e.target.value });
  }

  return (
    <select
      value={locale}
      onChange={handleChange}
      aria-label={t("switchLanguage")}
      className="text-sm border border-[#D0D0D0] px-2 py-1 bg-white hover:border-neutral-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black cursor-pointer"
    >
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l} value={l}>
          {t(l)}
        </option>
      ))}
    </select>
  );
}
