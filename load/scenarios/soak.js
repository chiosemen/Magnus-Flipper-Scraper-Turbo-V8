import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: '15m', target: 20 }, // Run for 15 minutes
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:5173');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
