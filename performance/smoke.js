import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://fakestoreapi.com';

// Smoke test: confirms the target endpoints are reachable and respond
// correctly under the lightest possible load (1 VU, a handful of
// iterations). This is a sanity check, not a load test — run it first,
// before the load scenario, to catch a broken endpoint or bad script
// without spending any real load budget on it.
export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate==0'],
    http_req_duration: ['p(95)<800'],
  },
};

export default function () {
  const productsRes = http.get(`${BASE_URL}/products`);
  check(productsRes, {
    'GET /products: status is 200': (r) => r.status === 200,
    'GET /products: returns an array': (r) => Array.isArray(r.json()),
  });

  const productRes = http.get(`${BASE_URL}/products/1`);
  check(productRes, {
    'GET /products/1: status is 200': (r) => r.status === 200,
    'GET /products/1: has an id': (r) => r.json('id') === 1,
  });

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ username: 'mor_2314', password: '83r5^_' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(loginRes, {
    'POST /auth/login: status is 201': (r) => r.status === 201,
    'POST /auth/login: returns a token': (r) => !!r.json('token'),
  });

  sleep(1);
}
