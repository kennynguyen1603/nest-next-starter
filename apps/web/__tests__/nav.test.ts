import { describe, it, expect } from "vitest";
import { NAV_ITEMS, isActivePath } from "../lib/nav";

describe("isActivePath", () => {
  it("matches the overview link only on the root path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/", "/notifications")).toBe(false);
    expect(isActivePath("/", "/security")).toBe(false);
  });

  it("matches a section link on its own path and nested paths", () => {
    expect(isActivePath("/security", "/security")).toBe(true);
    expect(isActivePath("/notifications", "/notifications/42")).toBe(true);
  });

  it("does not match a sibling path that shares a prefix", () => {
    expect(isActivePath("/security", "/security-old")).toBe(false);
    expect(isActivePath("/notifications", "/")).toBe(false);
  });

  it("marks exactly one nav item active per section", () => {
    for (const path of ["/", "/notifications", "/security"]) {
      const active = NAV_ITEMS.filter((i) => isActivePath(i.href, path));
      expect(active).toHaveLength(1);
      expect(active[0]!.href).toBe(path);
    }
  });
});
