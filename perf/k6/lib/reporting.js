// Pinned to a specific release tag, never `latest`/`main` — a suite that's supposed to be
// repeatable shouldn't have its reporting output silently change between runs because an
// upstream tag moved. Re-pin deliberately when upgrading: check
// https://github.com/benc-uk/k6-reporter/releases for the current tag.
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export function buildSummaryOutputs(data, scenarioName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return {
    [`reports/${scenarioName}-${timestamp}.html`]: htmlReport(data, {
      title: `${scenarioName} — ${timestamp}`,
    }),
    [`reports/${scenarioName}-${timestamp}.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
