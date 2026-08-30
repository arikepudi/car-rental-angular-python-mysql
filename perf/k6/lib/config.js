// Every number here traces back to the NFR interview (SKILL.md Phase 1), not an invented
// default. If these change, it should be because the user gave new numbers, not because a
// scenario file felt like tuning them.

export const BASE_URL = __ENV.K6_BASE_URL || 'http://localhost:8300';

// Current: ~20 TPS / ~100 concurrent users. Future (3x growth headroom): ~60 TPS / ~300
// concurrent users. The default "ramp to future TPS" profile (the on-demand/pre-merge
// profile — see growth-ramp.js) holds at CURRENT_TPS first, then ramps to FUTURE_TPS and
// holds there, so a single run validates both the baseline and the growth target.
export const CURRENT_TPS = 20;
export const FUTURE_TPS = 60;

// Latency thresholds, per critical transaction — never one blanket number (see
// k6-scenarios-thresholds-and-data.md for why a shared threshold hides per-endpoint
// regressions).
export const THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // <1% error rate ceiling
  'http_req_duration{name:browse_cars}': ['p(95)<500'],
  'http_req_duration{name:car_detail}': ['p(95)<500'],
  'http_req_duration{name:create_booking}': ['p(95)<800'],
  'http_req_duration{name:sign_in}': ['p(95)<500'],
};

// Business-critical transaction mix (SKILL.md Phase 1, question 4) — read-heavy browsing
// dominates real traffic, the booking write is lower-volume but highest-stakes, sign-in is
// occasional (most traffic is guests or already-signed-in browsing, not authenticating).
export const TRANSACTION_WEIGHTS = {
  browseCars: 0.55,
  carDetail: 0.3,
  createBooking: 0.1,
  signIn: 0.05,
};
