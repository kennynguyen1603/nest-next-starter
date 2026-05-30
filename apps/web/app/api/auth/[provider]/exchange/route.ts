import { NextRequest, NextResponse } from "next/server";

// API_URL is for server-side calls (Docker: use internal network URL via API_URL env var).
// NEXT_PUBLIC_API_URL is baked at build time for client-side only.
const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080";

type Provider = "google" | "facebook" | "github" | "twitter";

interface ExchangeBody {
  code: string;
  codeVerifier?: string;
}

function backendHeaders(browserUserAgent: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-forwarded-user-agent": browserUserAgent,
  };
}

async function exchangeGoogle(
  code: string,
  redirectUri: string,
  browserUserAgent: string,
) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Google token exchange failed");
  const { id_token } = await res.json();
  return fetch(`${API_URL}/api/v1/auth/google/login`, {
    method: "POST",
    headers: backendHeaders(browserUserAgent),
    body: JSON.stringify({ idToken: id_token }),
  });
}

async function exchangeFacebook(
  code: string,
  redirectUri: string,
  browserUserAgent: string,
) {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "",
    client_secret: process.env.FACEBOOK_APP_SECRET ?? "",
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(
    `https://graph.facebook.com/v23.0/oauth/access_token?${params}`,
  );
  if (!res.ok) throw new Error("Facebook token exchange failed");
  const { access_token } = await res.json();
  return fetch(`${API_URL}/api/v1/auth/facebook/login`, {
    method: "POST",
    headers: backendHeaders(browserUserAgent),
    body: JSON.stringify({ accessToken: access_token }),
  });
}

async function exchangeGithub(
  code: string,
  redirectUri: string,
  browserUserAgent: string,
) {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "",
      client_secret: process.env.GITHUB_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      code,
    }),
  });
  if (!res.ok) throw new Error("GitHub token exchange failed");
  const { access_token } = await res.json();
  return fetch(`${API_URL}/api/v1/auth/github/login`, {
    method: "POST",
    headers: backendHeaders(browserUserAgent),
    body: JSON.stringify({ accessToken: access_token }),
  });
}

async function exchangeTwitter(
  code: string,
  codeVerifier: string,
  redirectUri: string,
  browserUserAgent: string,
) {
  const credentials = Buffer.from(
    `${process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error("Twitter token exchange failed");
  const { access_token } = await res.json();
  return fetch(`${API_URL}/api/v1/auth/twitter/login`, {
    method: "POST",
    headers: backendHeaders(browserUserAgent),
    body: JSON.stringify({ accessToken: access_token }),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const origin = request.headers.get("origin") ?? "http://localhost:3000";
  const redirectUri = `${origin}/auth/${provider}/callback`;
  const browserUserAgent = request.headers.get("user-agent") ?? "";

  let body: ExchangeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { code, codeVerifier } = body;
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    let backendRes: Response;

    switch (provider as Provider) {
      case "google":
        backendRes = await exchangeGoogle(code, redirectUri, browserUserAgent);
        break;
      case "facebook":
        backendRes = await exchangeFacebook(
          code,
          redirectUri,
          browserUserAgent,
        );
        break;
      case "github":
        backendRes = await exchangeGithub(code, redirectUri, browserUserAgent);
        break;
      case "twitter":
        if (!codeVerifier) {
          return NextResponse.json(
            { error: "Missing codeVerifier" },
            { status: 400 },
          );
        }
        backendRes = await exchangeTwitter(
          code,
          codeVerifier,
          redirectUri,
          browserUserAgent,
        );
        break;
      default:
        return NextResponse.json(
          { error: "Unknown provider" },
          { status: 400 },
        );
    }

    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err?.message ?? "Auth failed" },
        { status: backendRes.status },
      );
    }

    const data = await backendRes.json();
    const response = NextResponse.json(data);
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Exchange failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
