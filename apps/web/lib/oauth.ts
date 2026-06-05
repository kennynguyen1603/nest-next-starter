export type OAuthProvider = "google" | "facebook" | "github" | "twitter";

const CALLBACK_BASE =
  typeof window !== "undefined"
    ? `${window.location.origin}/auth`
    : "http://localhost:3000/auth";

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 43);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

export async function buildOAuthUrl(provider: OAuthProvider): Promise<string> {
  const redirectUri = `${CALLBACK_BASE}/${provider}/callback`;
  const state = crypto.randomUUID();
  // Persist state so the callback can verify it (CSRF / auth-code-injection guard).
  sessionStorage.setItem("oauth_state", state);

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "offline",
      prompt: "consent",
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  if (provider === "facebook") {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "email,public_profile",
      state,
    });
    return `https://www.facebook.com/v23.0/dialog/oauth?${params}`;
  }

  if (provider === "github") {
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params}`;
  }

  if (provider === "twitter") {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem("twitter_code_verifier", verifier);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID ?? "",
      redirect_uri: redirectUri,
      scope: "tweet.read users.read offline.access",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return `https://twitter.com/i/oauth2/authorize?${params}`;
  }

  throw new Error(`Unknown provider: ${provider}`);
}
