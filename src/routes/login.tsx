import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/kit";
import { signInWithMagicLink } from "@/lib/auth";
import { BrandLogo } from "@/components/brand";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const adminWhatsAppNumber = (import.meta.env["VITE_ADMIN_WHATSAPP_NUMBER"] ?? "").replace(
  /\D/g,
  "",
);
const registrationHref = adminWhatsAppNumber
  ? `https://wa.me/${adminWhatsAppNumber}?text=${encodeURIComponent("Hi TradeHub admin, I would like to register for TradeHub.")}`
  : null;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await signInWithMagicLink(email);
      setNotice("Magic link sent. Check your inbox and return here to continue.");
      setEmail("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to send sign-in link.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-glass/90 p-6 shadow-xl backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-fg">
            <BrandLogo />
          </Link>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-fg-muted">
            <ShieldCheck size={12} /> Secure access
          </span>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            TradeHub access
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-fg">Sign in with email</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Use your work email to receive a secure magic link and open the dashboard.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-fg">Email address</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <input
                autoComplete="email"
                className="w-full rounded-md border border-border bg-bg/70 py-2.5 pl-10 pr-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-primary"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@tradehub.co"
                type="email"
                value={email}
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {notice}
            </div>
          ) : null}

          <Button
            className="w-full"
            disabled={isSubmitting || !email.trim() || !isSupabaseConfigured}
            type="submit"
          >
            {isSubmitting ? "Sending link..." : "Send magic link"}
          </Button>
        </form>

        <div className="mt-5 border-t border-border pt-4 text-center">
          <p className="text-sm text-fg-muted">New to TradeHub?</p>
          {registrationHref ? (
            <a
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md border border-accent/40 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
              href={registrationHref}
              rel="noreferrer"
              target="_blank"
            >
              Contact admin to register on WhatsApp
            </a>
          ) : (
            <p className="mt-2 text-xs text-warning">
              Registration contact is not configured. Please contact your administrator.
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-fg-muted">
          Need a different workspace?{" "}
          <Link to="/" className="text-accent hover:underline">
            Return home
          </Link>
        </p>

        <div
          className={`mt-6 rounded-md border px-3 py-2 text-xs ${
            isSupabaseConfigured
              ? "border-border bg-secondary/40 text-fg-muted"
              : "border-warning/30 bg-warning/10 text-warning"
          }`}
          role={isSupabaseConfigured ? undefined : "alert"}
        >
          {isSupabaseConfigured
            ? "The app uses Supabase magic links for secure tenant access."
            : "Sign-in is unavailable until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured in Cloudflare Workers Builds and the app is redeployed."}
        </div>
      </div>
    </div>
  );
}
