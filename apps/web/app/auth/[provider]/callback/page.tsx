"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function OAuthCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    async function exchange() {
      const { provider } = await params;
      const code = searchParams.get("code");
      const error = searchParams.get("error");
      const returnedState = searchParams.get("state");

      if (error || !code) {
        router.replace(
          `/login?error=${encodeURIComponent(error ?? "no_code")}`,
        );
        return;
      }

      // Verify the state we stored before redirecting (CSRF protection).
      const savedState = sessionStorage.getItem("oauth_state");
      sessionStorage.removeItem("oauth_state");
      if (!returnedState || returnedState !== savedState) {
        router.replace("/login?error=invalid_state");
        return;
      }

      const body: { code: string; codeVerifier?: string } = { code };

      if (provider === "twitter") {
        const verifier = sessionStorage.getItem("twitter_code_verifier");
        if (verifier) {
          body.codeVerifier = verifier;
          sessionStorage.removeItem("twitter_code_verifier");
        }
      }

      try {
        const res = await fetch(`/api/auth/${provider}/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          router.replace(
            `/login?error=${encodeURIComponent(data?.error ?? "auth_failed")}`,
          );
        } else {
          // The exchange route forwarded the httpOnly refresh cookie; the home
          // page restores the session from it (no token in localStorage).
          router.replace("/");
        }
      } catch {
        router.replace("/login?error=network_error");
      }
    }

    exchange();
  }, [params, searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-7">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border border-neutral-100 rounded-[9999px]" />
          <div className="absolute inset-0 border-2 border-neutral-200 border-t-black animate-spin rounded-[9999px]" />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-sm font-medium text-neutral-800">
            Authenticating…
          </p>
          <p className="text-xs text-neutral-400">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}
