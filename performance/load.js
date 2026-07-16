import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://fakestoreapi.com';

// Light load test against a handful of key endpoints. fakestoreapi.com is
// a free public mock API operated by someone else, not infrastructure we
// own — so this intentionally stays small (peak 10 VUs, well under a
// minute total) rather than scaling up into a stress or soak test. The
// goal is to demonstrate a load-testing workflow and catch gross latency
// regressions, not to find this API's breaking point.
export const options = {
  stages: [
    { duration: '15s', target: 10 }, // ramp up
    { duration: '30s', target: 10 }, // hold
    { duration: '10s', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    'http_req_duration{endpoint:getProducts}': ['p(95)<1000'],
    'http_req_duration{endpoint:getProductById}': ['p(95)<1000'],
    'http_req_duration{endpoint:login}': ['p(95)<1000'],
  },
};

export default function () {
  const productsRes = http.get(`${BASE_URL}/products`, {
    tags: { endpoint: 'getProducts' },
  });
  check(productsRes, {
    'GET /products: status is 200': (r) => r.status === 200,
  });

  const productRes = http.get(`${BASE_URL}/products/1`, {
    tags: { endpoint: 'getProductById' },
  });
  check(productRes, {
    'GET /products/1: status is 200': (r) => r.status === 200,
  });

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: 'mor_2314', password: '83r5^_' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { endpoint: 'login' } }
  );
  check(loginRes, {
    'POST /auth/login: status is 201': (r) => r.status === 201,
  });

  sleep(1);
}
