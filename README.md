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
```

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
