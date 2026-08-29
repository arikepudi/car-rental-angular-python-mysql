/** Unique per-run values so re-running the suite immediately never collides on a
 * uniqueness constraint (users.email) left over from the previous run. */
export function uniqueEmail(label = "e2e"): string {
  return `${label}+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** yyyy-MM-dd, `daysFromNow` in the future — always comfortably beyond the app's 48h
 * free-cancellation window unless a test deliberately wants otherwise. */
export function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
