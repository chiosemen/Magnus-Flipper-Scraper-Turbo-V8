import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getThresholds } from '../k6.config.js';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 100 }, // Sustained heavy load
    { duration: '1m', target: 0 },
  ],
  thresholds: getThresholds('stress'),
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
