// Stat values: `undefined` while loading, `null` when the request failed.
export type StatValue = number | null | undefined;

export function formatCount(value: StatValue, locale: string): string {
  if (value === undefined) return "…";
  if (value === null) return "—";
  return new Intl.NumberFormat(locale).format(value);
}

export function formatJoinDate(
  iso: string | undefined,
  locale: string,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
