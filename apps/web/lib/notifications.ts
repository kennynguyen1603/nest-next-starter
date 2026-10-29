export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  nextPage?: number;
  previousPage?: number;
}

export interface NotificationsResponse {
  data: Notification[];
  pagination: PaginationMeta;
}

export type NotificationFilter = "all" | "unread";

export const PAGE_SIZE = 20;

export function notificationsUrl(page: number, filter: NotificationFilter) {
  const unread = filter === "unread" ? "&isRead=false" : "";
  return `/api/v1/notifications?page=${page}&limit=${PAGE_SIZE}${unread}`;
}

// A relative-time message key, or null when the date should be shown as-is.
export type TimeAgo =
  | { key: "timeJustNow" | "timeYesterday"; count?: undefined }
  | { key: "timeHoursAgo" | "timeDaysAgo"; count: number }
  | null;

export function timeAgo(iso: string, now: number = Date.now()): TimeAgo {
  const diffMs = now - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return null;
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffH < 1) return { key: "timeJustNow" };
  if (diffH < 24) return { key: "timeHoursAgo", count: diffH };
  if (diffD === 1) return { key: "timeYesterday" };
  if (diffD < 7) return { key: "timeDaysAgo", count: diffD };
  return null;
}

export function formatNotificationDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
}
