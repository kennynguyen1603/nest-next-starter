export interface Session {
  id: number | string;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  platform?: string;
  lastUsedAt?: string;
  createdAt: string;
  isCurrent: boolean;
}

function lastActiveAt(s: Session): number {
  const t = new Date(s.lastUsedAt ?? s.createdAt).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Current session first, then most recently used. */
export function sortSessions(sessions: Session[]): Session[] {
  return [...sessions].sort(
    (a, b) =>
      Number(b.isCurrent) - Number(a.isCurrent) ||
      lastActiveAt(b) - lastActiveAt(a),
  );
}

// The API falls back to "Unknown Device" when it can't parse the user agent.
export function deviceLabel(s: Session): string | null {
  if (s.deviceName && s.deviceName !== "Unknown Device") return s.deviceName;
  return s.platform || null;
}

export function formatLastActive(s: Session, locale: string): string {
  const date = new Date(s.lastUsedAt ?? s.createdAt);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
