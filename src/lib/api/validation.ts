import { z } from "zod";

export const currencySchema = z.enum(["KES", "CNY", "USD"]);
export type Currency = z.infer<typeof currencySchema>;

export function normalizeKenyanPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) return null;

  const compact = trimmed.replace(/[\s()-]/g, "");
  const normalized = compact.startsWith("+254")
    ? compact
    : compact.startsWith("254")
      ? `+${compact}`
      : compact.startsWith("0")
        ? `+254${compact.slice(1)}`
        : `+254${compact}`;

  return /^\+254[17]\d{8}$/.test(normalized) ? normalized : null;
}

export const kenyanPhoneSchema = z.string().transform((value, context) => {
  const normalized = normalizeKenyanPhone(value);
  if (!normalized) {
    context.addIssue({ code: "custom", message: "Enter a valid Kenyan phone number." });
    return z.NEVER;
  }
  return normalized;
});

export const clientContactSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    phone: kenyanPhoneSchema,
  })
  .strict();
