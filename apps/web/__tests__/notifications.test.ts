import { describe, expect, it } from "vitest";
import {
  formatNotificationDate,
  notificationsUrl,
  timeAgo,
} from "../lib/notifications";

const NOW = Date.parse("2024-03-15T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const H = 3_600_000;

describe("notificationsUrl", () => {
  it("asks for one page of everything", () => {
    expect(notificationsUrl(1, "all")).toBe(
      "/api/v1/notifications?page=1&limit=20",
    );
  });

  it("adds the unread filter", () => {
    expect(notificationsUrl(3, "unread")).toBe(
      "/api/v1/notifications?page=3&limit=20&isRead=false",
    );
  });
});

describe("timeAgo", () => {
  it("is just now under an hour, including small clock skew", () => {
    expect(timeAgo(ago(59 * 60_000), NOW)).toEqual({ key: "timeJustNow" });
    expect(timeAgo(ago(-5 * 60_000), NOW)).toEqual({ key: "timeJustNow" });
  });

  it("counts hours up to a day", () => {
    expect(timeAgo(ago(H), NOW)).toEqual({ key: "timeHoursAgo", count: 1 });
    expect(timeAgo(ago(23 * H + 59 * 60_000), NOW)).toEqual({
      key: "timeHoursAgo",
      count: 23,
    });
  });

  it("says yesterday for one day", () => {
    expect(timeAgo(ago(24 * H), NOW)).toEqual({ key: "timeYesterday" });
    expect(timeAgo(ago(47 * H), NOW)).toEqual({ key: "timeYesterday" });
  });

  it("counts days up to a week", () => {
    expect(timeAgo(ago(48 * H), NOW)).toEqual({ key: "timeDaysAgo", count: 2 });
    expect(timeAgo(ago(6 * 24 * H), NOW)).toEqual({
      key: "timeDaysAgo",
      count: 6,
    });
  });

  it("falls back to the date from a week on, or for a bad date", () => {
    expect(timeAgo(ago(7 * 24 * H), NOW)).toBeNull();
    expect(timeAgo("not a date", NOW)).toBeNull();
  });
});

describe("formatNotificationDate", () => {
  it("formats in the given locale", () => {
    expect(formatNotificationDate("2024-03-01T08:00:00Z", "en")).toBe(
      "Mar 1, 2024",
    );
    expect(formatNotificationDate("2024-03-01T08:00:00Z", "vi")).toMatch(
      /2024/,
    );
  });

  it("shows a dash for a bad date", () => {
    expect(formatNotificationDate("nope", "en")).toBe("—");
  });
});
