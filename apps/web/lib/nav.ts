export const NAV_ITEMS = [
  { href: "/", key: "overview" },
  { href: "/notifications", key: "notifications" },
  { href: "/security", key: "security" },
] as const;

// `pathname` comes from next-intl's usePathname, so it never carries the locale prefix.
export function isActivePath(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
