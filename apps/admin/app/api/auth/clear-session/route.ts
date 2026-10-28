import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  // Only the admin app itself may end the session (blocks cross-site logout).
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const cookieStore = await cookies();
  // Must match the domain/path the API set the cookie with (APP_COOKIE_DOMAIN),
  // otherwise the browser keeps the original cookie.
  cookieStore.delete({
    name: "refresh_token",
    path: "/",
    domain: process.env.APP_COOKIE_DOMAIN || undefined,
  });
  return NextResponse.json({ ok: true });
}
