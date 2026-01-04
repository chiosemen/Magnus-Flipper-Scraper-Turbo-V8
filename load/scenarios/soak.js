import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getThresholds } from '../k6.config.js';

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '15m', target: 20 }, // Run for 15 minutes
    { duration: '2m', target: 0 },
  ],
  thresholds: getThresholds('soak'),
};

export default function () {
  const headers = __ENV.TEST_AUTH_TOKEN
    ? { Authorization: `Bearer ${__ENV.TEST_AUTH_TOKEN}` }
    : {};

  const health = http.get(`${BASE_URL}/api/health`);
  check(health, { 'health ok': (r) => r.status === 200 });

  const deals = http.get(`${BASE_URL}/api/deals?limit=10`, { headers });
  check(deals, { 'deals responds': (r) => r.status === 200 || r.status === 401 });
  sleep(1);
}
