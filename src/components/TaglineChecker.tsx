import { useState } from "react";
import { Sparkles, Copy } from "lucide-react";
import { Card, Button } from "@/components/kit";
import { checkTagline } from "@/lib/tagline-check.functions";
import type { TaglineResult } from "@/lib/tagline-check.server";
import { getSupabaseClient } from "@/lib/supabase/client";

export function TaglineChecker({ defaultTagline = "From China to the world" }: { defaultTagline?: string }) {
  const [canonical, setCanonical] = useState(defaultTagline);
  const [copy, setCopy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TaglineResult | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: sessionError } = await getSupabaseClient().auth.getSession();
      if (sessionError || !data.session) {
        setError("Please sign in again to use the brand copy checker.");
        return;
      }
      const r = await checkTagline({
        data: { canonical, copy },
        headers: { authorization: `Bearer ${data.session.access_token}` },
      });
      if (r.ok) setResult({ summary: r.summary, issues: r.issues });
      else setError(r.error);
    } catch {
      setError("We couldn't check that copy just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const field = "w-full rounded-md border border-border bg-bg-elev-1 px-3 py-2 text-sm text-fg outline-none focus:border-primary";

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <label className="block text-xs font-semibold uppercase tracking-wide text-fg-muted">
          Official tagline
          <input className={`${field} mt-1.5`} value={canonical} onChange={(e) => setCanonical(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-fg-muted">
          Page or brand copy to review
          <textarea
            className={`${field} mt-1.5 min-h-48 font-normal normal-case`}
            placeholder="Paste a page, email, or brand section here…"
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
          />
        </label>
        <Button onClick={run} disabled={busy || copy.trim().length < 3 || canonical.trim().length < 3}>
          <Sparkles className="h-4 w-4" />
          {busy ? "Checking…" : "Check consistency"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </Card>

      {result ? (
        <Card className="space-y-4 p-5">
          <p className="text-sm text-fg">{result.summary || "Review complete."}</p>
          {result.issues.length === 0 ? (
            <p className="text-sm text-fg-muted">No inconsistent wording found.</p>
          ) : (
            <ul className="space-y-3">
              {result.issues.map((i, n) => (
                <li key={n} className="rounded-md border border-border p-3">
                  <p className="text-sm text-fg-muted line-through">{i.original}</p>
                  <p className="mt-1 text-sm font-semibold text-fg">{i.suggestion}</p>
                  <p className="mt-1 text-xs text-fg-subtle">{i.problem}</p>
                  <button
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary"
                    onClick={() => navigator.clipboard.writeText(i.suggestion)}
                  >
                    <Copy className="h-3 w-3" /> Copy suggestion
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
    </div>
  );
}
