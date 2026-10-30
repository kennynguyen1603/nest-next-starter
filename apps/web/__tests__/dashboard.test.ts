import { describe, it, expect } from "vitest";
import { formatCount, formatJoinDate } from "../lib/dashboard";

describe("formatCount", () => {
  it("shows an ellipsis while loading", () => {
    expect(formatCount(undefined, "en")).toBe("…");
  });

  it("shows a dash when the request failed", () => {
    expect(formatCount(null, "en")).toBe("—");
  });

  it("formats zero", () => {
    expect(formatCount(0, "en")).toBe("0");
  });

  it("groups thousands per locale", () => {
    expect(formatCount(1234, "en")).toBe("1,234");
    expect(formatCount(1234, "vi")).toBe("1.234");
  });
});

describe("formatJoinDate", () => {
  it("shows a dash when the date is missing", () => {
    expect(formatJoinDate(undefined, "en")).toBe("—");
    expect(formatJoinDate("", "en")).toBe("—");
  });

  it("shows a dash for an invalid date", () => {
    expect(formatJoinDate("not-a-date", "en")).toBe("—");
  });

  it("formats a valid date for the locale", () => {
    expect(formatJoinDate("2024-03-15T12:00:00Z", "en")).toBe("Mar 15, 2024");
    expect(formatJoinDate("2024-03-15T12:00:00Z", "vi")).toContain("2024");
  });
});
