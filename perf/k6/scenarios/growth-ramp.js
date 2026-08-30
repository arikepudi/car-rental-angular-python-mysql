import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, CURRENT_TPS, FUTURE_TPS, THRESHOLDS, TRANSACTION_WEIGHTS } from '../lib/config.js';
import { JSON_HEADERS, randomCarId, randomEmailSuffix, randomFutureDateRange } from '../lib/helpers.js';
import { buildSummaryOutputs } from '../lib/reporting.js';

// "Ramp to the projected future TPS" — the on-demand/pre-merge profile: hold at today's
// baseline first (validates nothing regressed at current load), ramp to the projected future
// load, then hold there (validates it survives *sustained* future load, not just a momentary
// spike touching the target rate once). Total runtime ~4 minutes — fast enough to run before
// every merge, per the NFR interview's explicit ask for a fast on-demand profile.
export const options = {
  scenarios: {
    growthRamp: {
      executor: 'ramping-arrival-rate',
      startRate: CURRENT_TPS,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 150,
      stages: [
        { target: CURRENT_TPS, duration: '1m' }, // hold at today's baseline
        { target: FUTURE_TPS, duration: '1m' }, // ramp to the projected future TPS
        { target: FUTURE_TPS, duration: '2m' }, // hold there — sustained, not just momentary
      ],
    },
  },
  thresholds: THRESHOLDS,
};

const NUM_POOLED_USERS = 20;

// Pre-provision a pool of real accounts once, before the ramp starts, rather than signing up
// fresh every iteration — bcrypt hashing is deliberately CPU-expensive per call, so a scenario
// that signs up at the target arrival rate would be measuring password-hashing throughput, not
// this app's real steady-state traffic (almost none of which is new-account creation at high
// frequency). See k6-scenarios-thresholds-and-data.md.
export function setup() {
  const users = [];
  for (let i = 0; i < NUM_POOLED_USERS; i++) {
    const email = `loadtest-${i}-${randomEmailSuffix()}@example.com`;
    const password = 'load-test-password-123';
    const res = http.post(
      `${BASE_URL}/api/auth/signup`,
      JSON.stringify({ email, password, name: `Load Test User ${i}` }),
      { headers: JSON_HEADERS, tags: { name: 'setup_signup' } },
    );
    if (res.status !== 200) {
      throw new Error(`setup(): failed to provision pooled user ${i} — status ${res.status}: ${res.body}`);
    }
    users.push({ email, password });
  }
  return { users };
}

function browseCars() {
  const res = http.get(`${BASE_URL}/api/cars`, { tags: { name: 'browse_cars' } });
  check(res, { 'browse_cars: 200': (r) => r.status === 200 });
}

function carDetail() {
  const res = http.get(`${BASE_URL}/api/cars/${randomCarId()}`, { tags: { name: 'car_detail' } });
  check(res, { 'car_detail: 200': (r) => r.status === 200 });
}

function createBooking() {
  // Guest checkout, deliberately — isolates booking-creation latency (the row-lock + overlap
  // check this app's own docs call out as the critical write path) from sign-in/auth overhead.
  // Randomized car + date range per iteration to avoid manufacturing artificial lock
  // contention — see k6-scenarios-thresholds-and-data.md.
  const { starts_at, ends_at } = randomFutureDateRange();
  const suffix = randomEmailSuffix();
  const res = http.post(
    `${BASE_URL}/api/bookings`,
    JSON.stringify({
      car_id: randomCarId(),
      starts_at,
      ends_at,
      customer_name: `Load Test Guest ${suffix}`,
      email: `loadtest-guest-${suffix}@example.com`,
    }),
    { headers: JSON_HEADERS, tags: { name: 'create_booking' } },
  );
  // 201/200 = booked; 409 = a genuine (rare, given randomized dates) overlap — both are valid
  // outcomes of real traffic. Anything else (500, etc.) is a real failure.
  check(res, { 'create_booking: 2xx or 409': (r) => (r.status >= 200 && r.status < 300) || r.status === 409 });
}

function signIn(users) {
  const user = users[Math.floor(Math.random() * users.length)];
  const res = http.post(
    `${BASE_URL}/api/auth/sign-in`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: JSON_HEADERS, tags: { name: 'sign_in' } },
  );
  check(res, { 'sign_in: 200': (r) => r.status === 200 });
}

export default function (data) {
  const r = Math.random();
  let cumulative = 0;
  for (const [action, weight] of Object.entries(TRANSACTION_WEIGHTS)) {
    cumulative += weight;
    if (r < cumulative) {
      if (action === 'browseCars') return browseCars();
      if (action === 'carDetail') return carDetail();
      if (action === 'createBooking') return createBooking();
      if (action === 'signIn') return signIn(data.users);
    }
  }
}

export function handleSummary(data) {
  return buildSummaryOutputs(data, 'growth-ramp');
}
