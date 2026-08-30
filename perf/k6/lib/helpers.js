import { BASE_URL } from './config.js';

// The app's CSRF defense-in-depth (verify_origin in server/app/deps.py) requires an Origin
// header matching a trusted origin on every state-changing request — without this, POST/DELETE
// requests get a 403 that has nothing to do with load, and would silently skew results toward
// "the app is broken" rather than measuring real throughput.
export const JSON_HEADERS = { 'Content-Type': 'application/json', Origin: BASE_URL };

// Spread across the seeded catalog (9 cars from server/app/seed_data.py) rather than
// concentrating on one — see k6-scenarios-thresholds-and-data.md on avoiding artificial lock
// contention on the booking-creation row lock.
export function randomCarId() {
  return Math.floor(Math.random() * 9) + 1;
}

// Spread far enough into the future, and across a wide enough window, that two random
// iterations picking the same car rarely land on truly overlapping dates by chance — real
// overlap 409s should be a rare, incidental signal, not the dominant outcome of test-data
// collisions.
export function randomFutureDateRange() {
  const startOffset = 3 + Math.floor(Math.random() * 3000);
  const start = new Date();
  start.setDate(start.getDate() + startOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1 + Math.floor(Math.random() * 5));
  const iso = (d) => d.toISOString().slice(0, 10) + 'T10:00:00';
  return { starts_at: iso(start), ends_at: iso(end) };
}

export function randomEmailSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
