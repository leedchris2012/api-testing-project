# Fake Store API Testing Demo — Design Spec

## Purpose

A portfolio project demonstrating API testing with Playwright against
[fakestoreapi.com](https://fakestoreapi.com/). Goals:

- Showcase Playwright API testing fundamentals (GET/POST/PUT/DELETE, status
  codes, response validation).
- Showcase real-world test architecture (client wrappers, fixtures, config).
- Showcase CI/CD integration via GitHub Actions.

## Tech Stack

- **Language**: TypeScript
- **Test runner**: Playwright Test (`@playwright/test`), using its built-in
  `request` fixture / `APIRequestContext` — no separate HTTP client needed.
- **Schema validation**: Zod — schemas double as the source of truth for
  TypeScript types via `z.infer`.
- **CI**: GitHub Actions.
- **Reporting**: Playwright's built-in HTML reporter, uploaded as a CI
  artifact.

## API Scope

Full coverage of fakestoreapi.com's resource groups:

- **Products** (`/products`) — list, get by id, filter by category, sort,
  create, update, delete.
- **Carts** (`/carts`) — list, get by id, get by user, create, update,
  delete.
- **Users** (`/users`) — list, get by id, create, update, delete.
- **Auth** (`/auth/login`) — valid/invalid login, token issuance.

## Architecture

### Folder structure

```
my-api-testing-project/
├── .github/workflows/playwright.yml   # CI pipeline
├── src/
│   ├── clients/                       # typed API wrappers (one per resource)
│   │   ├── base-client.ts             # shared request logic, base URL, headers
│   │   ├── products-client.ts
│   │   ├── carts-client.ts
│   │   ├── users-client.ts
│   │   └── auth-client.ts
│   ├── schemas/                       # Zod schemas (+ inferred types) per resource
│   │   ├── product.schema.ts
│   │   ├── cart.schema.ts
│   │   ├── user.schema.ts
│   │   └── auth.schema.ts
│   ├── fixtures/
│   │   └── api-fixtures.ts            # extends `test` to inject clients
│   └── test-data/                     # builders/factories for request payloads
│       └── product-factory.ts (etc.)
├── tests/
│   ├── products/
│   │   ├── get-products.spec.ts
│   │   ├── crud-products.spec.ts
│   │   └── negative-products.spec.ts
│   ├── carts/
│   ├── users/
│   └── auth/
├── playwright.config.ts
├── package.json / tsconfig.json
├── .env.example
└── README.md
```

Each resource gets a client (talks to the API), a schema (validates the
shape), and one or more spec files (asserts behavior) — the same separation
of concerns as Page Object Model, applied to APIs.

### API client layer

`base-client.ts` wraps Playwright's `APIRequestContext`:

```typescript
export class BaseClient {
  constructor(protected request: APIRequestContext) {}
}
```

Resource clients extend it with typed methods returning the raw
`APIResponse` (so tests can assert status codes):

```typescript
export class ProductsClient extends BaseClient {
  async getAll() { return this.request.get('/products'); }
  async getById(id: number) { return this.request.get(`/products/${id}`); }
  async create(payload: NewProduct) { return this.request.post('/products', { data: payload }); }
  async update(id: number, payload: Partial<NewProduct>) { return this.request.put(`/products/${id}`, { data: payload }); }
  async delete(id: number) { return this.request.delete(`/products/${id}`); }
}
```

### Schema validation

Zod schemas define expected shape and double as the TypeScript type:

```typescript
export const ProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  category: z.string(),
  description: z.string(),
  image: z.string().url(),
  rating: z.object({ rate: z.number(), count: z.number() }),
});
export type Product = z.infer<typeof ProductSchema>;
```

Tests validate with `ProductSchema.parse(body)`, which throws a readable
diff on mismatch — real contract validation, not spot-checking a few
fields.

### Fixtures

`api-fixtures.ts` extends Playwright's `test` to inject clients via
dependency injection:

```typescript
export const test = base.extend<{
  productsApi: ProductsClient;
  cartsApi: CartsClient;
  usersApi: UsersClient;
  authApi: AuthClient;
}>({
  productsApi: async ({ request }, use) => use(new ProductsClient(request)),
  cartsApi: async ({ request }, use) => use(new CartsClient(request)),
  usersApi: async ({ request }, use) => use(new UsersClient(request)),
  authApi: async ({ request }, use) => use(new AuthClient(request)),
});
```

Tests then read as: `test('gets all products', async ({ productsApi }) => { ... })`.

## Test Suite Organization

Each resource gets 2–3 spec files following a consistent pattern:

- **`get-*.spec.ts`** — read operations: list, get-by-id, filtering/sorting
  (e.g. `/products?sort=desc`, `/products/category/:name`), response schema
  validation, status codes.
- **`crud-*.spec.ts`** — create/update/delete flows, verifying request
  payloads round-trip into the response shape correctly.
- **`negative-*.spec.ts`** — edge cases: invalid IDs (404s), malformed
  payloads, missing required fields, wrong content-types.

Tests are tagged for selective runs (e.g. `{ tag: '@smoke' }`), so CI can
run a fast smoke subset on every push and the full suite on PRs/schedule.

**`auth/login.spec.ts`** covers `/auth/login`: valid credentials returning a
token, invalid credentials returning 401, and using the returned token as a
Bearer header on a subsequent request to demonstrate token propagation.

### Known caveat (documented in README)

fakestoreapi is a mock API — POST/PUT/DELETE return realistic responses but
don't persist changes server-side, and there's no real auth enforcement on
other endpoints. Tests validate request/response *contracts* and status
codes, not actual data persistence. This is called out explicitly in the
README so it reads as informed design rather than a gap.

## CI/CD & Configuration

### `playwright.config.ts`

- `baseURL: 'https://fakestoreapi.com'`, overridable via `.env` /
  `API_BASE_URL`.
- `use: { extraHTTPHeaders: { 'Content-Type': 'application/json' } }`.
- Reporter: `html` (built-in) plus `list` for readable CI logs.
- Retries: `2` on CI only (public demo API network flakiness), `0` locally.
- Projects optionally split by tag (`smoke`, `full`).

### `.github/workflows/playwright.yml`

- Triggers: `push` to main, `pull_request`, manual `workflow_dispatch`.
- Steps: checkout → setup Node → `npm ci` → `npx playwright install --with-deps`
  → `npx playwright test` → upload `playwright-report/` as an artifact
  (30-day retention).
- No browser UI involved, so this runs fast.

### README.md

Includes: what the project demonstrates, setup/run instructions, folder
structure explanation, the fakestoreapi mock-behavior caveat, and a
badge/screenshot of the GitHub Actions run.
