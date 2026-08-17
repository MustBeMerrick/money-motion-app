const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(cents: number): string {
  const formatted = usd.format(Math.abs(cents) / 100);
  return cents < 0 ? `-${formatted}` : formatted;
}

export function formatCentsSigned(cents: number): string {
  return cents > 0 ? `+${usd.format(cents / 100)}` : formatCents(cents);
}

// An even split of a shared bill. Rounds the half-cent up so the person paying
// the bill is never short: $24.99 splits to $12.50, not $12.49.
export function splitHalfCents(cents: number): number {
  return Math.round(cents / 2);
}

export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
