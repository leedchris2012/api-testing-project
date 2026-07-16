# Fake Store API — Playwright Test Suite

A TypeScript Playwright API testing demo against the public
[fakestoreapi.com](https://fakestoreapi.com/) mock store API. Covers
products, carts, users, and auth with typed API clients, Zod schema
validation, and a CI pipeline.

## What this demonstrates

- **API testing fundamentals**: GET/POST/PUT/DELETE across four resources,
  status code assertions, response schema validation.
- **Test architecture**: typed client classes per resource
  (`src/clients/`), Zod schemas as the single source of truth for both
  validation and TypeScript types (`src/schemas/`), and Playwright fixtures
  for dependency injection (`src/fixtures/`) — the API-testing equivalent
  of the Page Object Model.
- **CI/CD**: GitHub Actions runs the full suite on every push/PR and
  uploads the HTML report as a build artifact.
- **Performance testing**: a small [k6](https://k6.io/) suite
  (`performance/`) load-tests the same endpoints — see
  [Performance testing](#performance-testing) below.

## Getting started

```bash
npm install
npm test              # run the full suite
npm run test:smoke    # run only @smoke-tagged tests
npm run test:report   # open the last HTML report
```

No browser install step is required — every test uses Playwright's
`APIRequestContext`, not a browser `page`.

## Project structure

```
src/
  clients/    # typed wrappers around APIRequestContext, one per resource
  schemas/    # Zod schemas (+ inferred TS types) per resource
  fixtures/   # Playwright test extended with client fixtures
tests/
  products/   # get / crud / negative specs
  carts/
  users/
  auth/
performance/  # k6 smoke and load scripts
```

## Performance testing

A small [k6](https://k6.io/) suite lives in `performance/`, covering the
same three endpoints exercised functionally above: `GET /products`,
`GET /products/:id`, and `POST /auth/login`.

```bash
brew install k6       # one-time, if not already installed
npm run test:perf:smoke   # 1 VU, 10s — sanity check before running load
npm run test:perf:load    # ramps to 10 VUs, ~55s total
```

- **`smoke.js`**: 1 virtual user, 10 seconds. Confirms the endpoints are
  reachable and responding correctly before spending any load budget —
  run this first, and always after changing a script.
- **`load.js`**: ramps to 10 concurrent virtual users over a ~55 second
  run, asserting a `p(95)` response-time threshold per endpoint (products
  list, product detail, login) plus one overall error-rate threshold
  across all requests.

**Why the load profile is intentionally small**: `fakestoreapi.com` is a
free public mock API operated by someone else, not infrastructure this
project owns. The goal here is to demonstrate a performance-testing
workflow — scripting, thresholds, ramping VUs, per-endpoint tagging — and
catch gross latency regressions, not to stress-test or find the breaking
point of a third party's free service. A stress, spike, or soak test
against `fakestoreapi.com` would be inappropriate and isn't included.

## A note on the API's mock behavior

fakestoreapi.com is a mock: `POST`/`PUT`/`DELETE` return realistic-looking
responses but don't persist changes server-side, and there's no real auth
enforcement on non-auth endpoints. This suite tests request/response
*contracts*, not actual data persistence. A few concrete quirks the tests
encode on purpose:

- An unknown product id returns `200` with an **empty body**, not `404`.
- An unknown cart/user id returns `200` with a **literal `null` body**.
- `PUT` responses only contain the fields you sent, not the full merged
  resource.
- `POST /users` only echoes back the new `id`, not the rest of the
  payload.
- Successful creates and logins return `201`.

## CI

See `.github/workflows/playwright.yml`. Runs on push to `main`, on pull
requests, and on manual dispatch; publishes the HTML report as a 30-day
artifact.
