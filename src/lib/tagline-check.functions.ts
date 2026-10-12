import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSession } from "./auth/require-session";
import { logError } from "./logger";

const checkTaglineInput = z
  .object({
    canonical: z.string().trim().min(3).max(300),
    copy: z.string().trim().min(3).max(20000),
  })
  .strict();

export const checkTagline = createServerFn({ method: "POST" })
  .validator((data: unknown) => checkTaglineInput.parse(data))
  .handler(async ({ data }) => {
    try {
      await requireSession(getRequest());
      const { runTaglineCheck } = await import("./tagline-check.server");
      return { ok: true as const, ...(await runTaglineCheck(data.canonical, data.copy)) };
    } catch (error) {
      if (error instanceof Response) throw error;
      logError("tagline.check_failed", error);
      return {
        ok: false as const,
        error: "We couldn't check that copy just now. Please try again in a moment.",
      };
    }
  });
