import { describe, it, expect } from "vitest";
import {
  deviceLabel,
  formatLastActive,
  sortSessions,
  type Session,
} from "../lib/sessions";

const session = (over: Partial<Session> = {}): Session => ({
  id: 1,
  createdAt: "2024-03-01T10:00:00Z",
  isCurrent: false,
  ...over,
});

describe("sortSessions", () => {
  it("puts the current session first, then the most recently used", () => {
    const list = [
      session({ id: 1, lastUsedAt: "2024-03-02T00:00:00Z" }),
      session({ id: 2, lastUsedAt: "2024-03-05T00:00:00Z" }),
      session({ id: 3, lastUsedAt: "2024-01-01T00:00:00Z", isCurrent: true }),
    ];
    expect(sortSessions(list).map((s) => s.id)).toEqual([3, 2, 1]);
  });

  it("falls back to createdAt when lastUsedAt is missing", () => {
    const list = [
      session({ id: 1, createdAt: "2024-01-01T00:00:00Z" }),
      session({ id: 2, createdAt: "2024-02-01T00:00:00Z" }),
    ];
    expect(sortSessions(list).map((s) => s.id)).toEqual([2, 1]);
  });

  it("does not mutate its input", () => {
    const list = [session({ id: 1 }), session({ id: 2, isCurrent: true })];
    sortSessions(list);
    expect(list.map((s) => s.id)).toEqual([1, 2]);
  });
});

describe("deviceLabel", () => {
  it("uses the device name", () => {
    expect(deviceLabel(session({ deviceName: "Chrome 120 on macOS" }))).toBe(
      "Chrome 120 on macOS",
    );
  });

  it("falls back to the platform for the API's unknown placeholder", () => {
    expect(
      deviceLabel(session({ deviceName: "Unknown Device", platform: "web" })),
    ).toBe("web");
  });

  it("returns null when nothing identifies the device", () => {
    expect(deviceLabel(session({ deviceName: "Unknown Device" }))).toBeNull();
    expect(deviceLabel(session())).toBeNull();
  });
});

describe("formatLastActive", () => {
  it("prefers lastUsedAt", () => {
    const s = session({ lastUsedAt: "2024-03-15T12:00:00Z" });
    expect(formatLastActive(s, "en")).toContain("Mar 15, 2024");
  });

  it("falls back to createdAt", () => {
    expect(formatLastActive(session(), "en")).toContain("Mar 1, 2024");
  });

  it("shows a dash for an invalid date", () => {
    expect(formatLastActive(session({ createdAt: "nope" }), "en")).toBe("—");
  });
});
