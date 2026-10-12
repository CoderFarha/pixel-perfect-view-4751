import assert from "node:assert/strict";
import test from "node:test";
import {
  clientContactSchema,
  currencySchema,
  kenyanPhoneSchema,
  normalizeKenyanPhone,
} from "../validation.ts";

test("strict client contact schema rejects unknown fields", () => {
  const result = clientContactSchema.safeParse({
    name: "Amina",
    phone: "0712345678",
    ignored: true,
  });
  assert.equal(result.success, false);
});

test("missing required client fields produce useful validation errors", () => {
  const result = clientContactSchema.safeParse({});
  assert.equal(result.success, false);
  if (result.success) return;

  assert.deepEqual(
    result.error.issues.map((issue) => issue.path[0]),
    ["name", "phone"],
  );
  assert.ok(result.error.issues.every((issue) => issue.message.length > 0));
});

test("Kenyan phone numbers normalize to E.164", () => {
  assert.equal(normalizeKenyanPhone("0712 345 678"), "+254712345678");
  assert.equal(kenyanPhoneSchema.parse("+254 112-345-678"), "+254112345678");
  assert.equal(normalizeKenyanPhone("123"), null);
});

test("currency schema accepts supported currencies and rejects others", () => {
  assert.equal(currencySchema.parse("KES"), "KES");
  assert.equal(currencySchema.parse("CNY"), "CNY");
  assert.equal(currencySchema.parse("USD"), "USD");
  assert.equal(currencySchema.safeParse("EUR").success, false);
});
