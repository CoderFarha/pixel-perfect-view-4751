import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { logError } from "@/lib/logger";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    let isActive = true;

    async function handleAuthCallback() {
      try {
        const code = new URLSearchParams(window.location.search).get("code");

        if (code) {
          const { error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }
        }

        const { data, error } = await getSupabaseClient().auth.getSession();

        if (!isActive) {
          return;
        }

        if (error) {
          throw error;
        }

        if (data.session) {
          setStatus("Signed in. Redirecting to the dashboard...");
          navigate({ to: "/app", replace: true });
          return;
        }

        navigate({ to: "/login", replace: true });
      } catch (error) {
        logError("auth.callback_failed", error);

        if (isActive) {
          setStatus("We could not validate your sign-in. Returning to login.");
          navigate({ to: "/login", replace: true });
        }
      }
    }

    void handleAuthCallback();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4">
      <div className="rounded-2xl border border-border bg-bg-glass/90 px-6 py-5 text-center shadow-lg">
        <p className="text-sm font-medium text-fg">{status}</p>
      </div>
    </div>
  );
}
