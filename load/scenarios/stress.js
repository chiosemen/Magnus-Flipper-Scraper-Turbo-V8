import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '2m', target: 100 }, // Sustained heavy load
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
  },
};

export default function () {
  const res = http.get('http://localhost:5173');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
