import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
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
