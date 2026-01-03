import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 30 }, // Ramp up to 30 users
    { duration: '1m', target: 30 },  // Stay at 30
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const res = http.get('http://localhost:5173');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
