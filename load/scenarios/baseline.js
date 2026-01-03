import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

export default function () {
  const res = http.get('http://localhost:5173');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}
