# Fake Store API Testing Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript Playwright API test suite against the live fakestoreapi.com, covering products/carts/users/auth, with typed clients, Zod schema validation, and a GitHub Actions CI pipeline.

**Architecture:** Typed API client classes (one per resource) wrap Playwright's built-in `APIRequestContext`. Zod schemas validate response shapes and double as TypeScript types. Custom Playwright fixtures inject clients into tests. Spec files are organized by resource and split into happy-path / CRUD / negative test files.

**Tech Stack:** TypeScript, `@playwright/test` (using its `request` fixture — no browser binaries needed), Zod, GitHub Actions.

## Global Constraints

- Language: TypeScript, `strict: true`.
- Base URL: `https://fakestoreapi.com`, overridable via `API_BASE_URL` env var.
- No browser binaries are installed or required — these are pure API tests using `APIRequestContext`, not `page`.
- CI: GitHub Actions, triggered on push to `main`, pull requests, and manual dispatch. Retries: `2` on CI, `0` locally.
- Reporter: Playwright's built-in `html` reporter (uploaded as a CI artifact) plus `list` for console output.
- Tests are tagged `@smoke` where noted, so `npm run test:smoke` can run a fast subset.
- fakestoreapi.com is a mock API: writes don't persist server-side and there's no real auth enforcement on non-auth endpoints. Tests validate request/response *contracts*, not persistence.

## Ground-Truth API Behavior (verified live 2026-07-15)

These are not assumptions — they were confirmed with `curl` against the live API and must match the test assertions exactly:

| Endpoint | Status | Body notes |
|---|---|---|
| `GET /products` | 200 | array of Product |
| `GET /products/:id` (valid) | 200 | Product object |
| `GET /products/:id` (invalid, e.g. 999999) | 200 | **empty body (0 bytes)** — not `404`, not `null` |
| `GET /products/category/:cat` (unknown) | 200 | `[]` |
| `POST /products` | **201** | `{id, ...submitted fields}` (no `rating`) |
| `PUT /products/:id` | 200 | `{id, ...only the fields sent}` — **not merged** with existing data |
| `DELETE /products/:id` | 200 | full original product object |
| `GET /carts/:id` (invalid) | 200 | **`null`** (not empty body) |
| `POST /carts` | **201** | `{id, ...submitted fields}` |
| `PUT /carts/:id` | 200 | `{id, ...only the fields sent}` |
| `DELETE /carts/:id` | 200 | full original cart object |
| `GET /users/:id` (invalid) | 200 | **`null`** |
| `POST /users` | **201** | **`{id}` only** — does not echo submitted fields |
| `PUT /users/:id` | 200 | `{...only the fields sent}` (no id echoed back in the field set beyond what's sent) |
| `DELETE /users/:id` | 200 | full original user object |
| `POST /auth/login` (valid) | **201** | `{token}` |
| `POST /auth/login` (invalid) | 401 | **plain text**, not JSON: `"username or password is incorrect"` |

Known valid test credentials (from fakestoreapi's own docs, confirmed working): `username: "mor_2314"`, `password: "83r5^_"`.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Produces: npm scripts `test`, `test:smoke`, `test:report`; Playwright config with `baseURL` resolved from `process.env.API_BASE_URL ?? 'https://fakestoreapi.com'`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "fakestoreapi-playwright-tests",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "test": "playwright test",
    "test:smoke": "playwright test --grep @smoke",
    "test:report": "playwright show-report"
  },
  "dependencies": {
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@types/node": "^20.14.0",
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "playwright.config.ts"]
}
```

- [ ] **Step 3: Create `playwright.config.ts`**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: process.env.API_BASE_URL ?? 'https://fakestoreapi.com',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
});
```

- [ ] **Step 4: Create `.env.example`**

```
API_BASE_URL=https://fakestoreapi.com
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
playwright-report/
test-results/
.env
```

- [ ] **Step 6: Install dependencies**

Run: `npm install`
Expected: installs successfully, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 7: Verify the config compiles and Playwright can load it**

Run: `npx playwright test --list`
Expected: exits 0, prints `Total: 0 tests in 0 files` (no test files exist yet).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json playwright.config.ts .env.example .gitignore
git commit -m "chore: scaffold Playwright TypeScript project"
```

---

### Task 2: Products — Schema, Clients, Fixtures, and GET Tests

**Files:**
- Create: `src/schemas/product.schema.ts`
- Create: `src/clients/base-client.ts`
- Create: `src/clients/products-client.ts`
- Create: `src/fixtures/api-fixtures.ts`
- Create: `tests/products/get-products.spec.ts`

**Interfaces:**
- Produces: `ProductSchema`, `ProductListSchema`, `NewProductSchema`, `CreatedProductSchema`, `Product` type, `NewProduct` type (all from `src/schemas/product.schema.ts`).
- Produces: `BaseClient` class — `constructor(protected request: APIRequestContext)`.
- Produces: `ProductsClient` class extending `BaseClient` with methods `getAll(options?: { headers?: Record<string, string> })`, `getById(id: number)`, `getByCategory(category: string)`, `getCategories()`, `create(payload: NewProduct)`, `update(id: number, payload: Partial<NewProduct>)`, `delete(id: number)` — all `Promise<APIResponse>`.
- Produces: `test` (extended Playwright test) and `expect` re-exported from `src/fixtures/api-fixtures.ts`, with a `productsApi: ProductsClient` fixture.

- [ ] **Step 1: Create the product schema**

`src/schemas/product.schema.ts`:

```typescript
import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  description: z.string(),
  category: z.string(),
  image: z.string().url(),
  rating: z.object({
    rate: z.number(),
    count: z.number(),
  }),
});
export type Product = z.infer<typeof ProductSchema>;
export const ProductListSchema = z.array(ProductSchema);

export const NewProductSchema = z.object({
  title: z.string(),
  price: z.number(),
  description: z.string(),
  image: z.string().url(),
  category: z.string(),
});
export type NewProduct = z.infer<typeof NewProductSchema>;

export const CreatedProductSchema = NewProductSchema.extend({ id: z.number() });
```

- [ ] **Step 2: Create the base client**

`src/clients/base-client.ts`:

```typescript
import { APIRequestContext } from '@playwright/test';

export class BaseClient {
  constructor(protected request: APIRequestContext) {}
}
```

- [ ] **Step 3: Create the products client**

`src/clients/products-client.ts`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';
import type { NewProduct } from '../schemas/product.schema';

export class ProductsClient extends BaseClient {
  async getAll(options?: { headers?: Record<string, string> }): Promise<APIResponse> {
    return this.request.get('/products', options);
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  async getByCategory(category: string): Promise<APIResponse> {
    return this.request.get(`/products/category/${category}`);
  }

  async getCategories(): Promise<APIResponse> {
    return this.request.get('/products/categories');
  }

  async create(payload: NewProduct): Promise<APIResponse> {
    return this.request.post('/products', { data: payload });
  }

  async update(id: number, payload: Partial<NewProduct>): Promise<APIResponse> {
    return this.request.put(`/products/${id}`, { data: payload });
  }

  async delete(id: number): Promise<APIResponse> {
    return this.request.delete(`/products/${id}`);
  }
}
```

- [ ] **Step 4: Create the fixtures file**

`src/fixtures/api-fixtures.ts`:

```typescript
import { test as base } from '@playwright/test';
import { ProductsClient } from '../clients/products-client';

export type ApiFixtures = {
  productsApi: ProductsClient;
};

export const test = base.extend<ApiFixtures>({
  productsApi: async ({ request }, use) => {
    await use(new ProductsClient(request));
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 5: Write the GET tests**

`tests/products/get-products.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';
import { ProductListSchema, ProductSchema } from '../../src/schemas/product.schema';

test.describe('GET /products', () => {
  test('returns a list of products matching the schema', { tag: '@smoke' }, async ({ productsApi }) => {
    const response = await productsApi.getAll();
    expect(response.status()).toBe(200);

    const body = await response.json();
    const products = ProductListSchema.parse(body);
    expect(products.length).toBeGreaterThan(0);
  });

  test('returns a single product by id', { tag: '@smoke' }, async ({ productsApi }) => {
    const response = await productsApi.getById(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const product = ProductSchema.parse(body);
    expect(product.id).toBe(1);
  });

  test('returns products filtered by category', async ({ productsApi }) => {
    const response = await productsApi.getByCategory("men's clothing");
    expect(response.status()).toBe(200);

    const body = await response.json();
    const products = ProductListSchema.parse(body);
    for (const product of products) {
      expect(product.category).toBe("men's clothing");
    }
  });

  test('returns the list of available categories', async ({ productsApi }) => {
    const response = await productsApi.getCategories();
    expect(response.status()).toBe(200);

    const body: string[] = await response.json();
    expect(body).toEqual(
      expect.arrayContaining(['electronics', 'jewelery', "men's clothing", "women's clothing"])
    );
  });
});
```

- [ ] **Step 6: Run the tests and verify they pass**

Run: `npx playwright test tests/products/get-products.spec.ts`
Expected: `4 passed` (all green against the live API).

- [ ] **Step 7: Commit**

```bash
git add src/schemas/product.schema.ts src/clients/base-client.ts src/clients/products-client.ts src/fixtures/api-fixtures.ts tests/products/get-products.spec.ts
git commit -m "feat: add products client, schema, fixtures, and GET tests"
```

---

### Task 3: Products — CRUD Tests

**Files:**
- Create: `tests/products/crud-products.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from `src/fixtures/api-fixtures.ts`; `CreatedProductSchema`, `NewProduct` from `src/schemas/product.schema.ts`; `ProductsClient.create/update/delete` from Task 2.

- [ ] **Step 1: Write the CRUD tests**

`tests/products/crud-products.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';
import { CreatedProductSchema } from '../../src/schemas/product.schema';
import type { NewProduct } from '../../src/schemas/product.schema';

test.describe('Products CRUD', () => {
  const newProduct: NewProduct = {
    title: 'Test Product',
    price: 19.99,
    description: 'A product created by an automated test.',
    image: 'https://i.pravatar.cc/300',
    category: 'electronics',
  };

  test('creates a new product', async ({ productsApi }) => {
    const response = await productsApi.create(newProduct);
    expect(response.status()).toBe(201);

    const body = await response.json();
    const created = CreatedProductSchema.parse(body);
    expect(created.title).toBe(newProduct.title);
    expect(created.price).toBe(newProduct.price);
  });

  test('updates an existing product', async ({ productsApi }) => {
    // fakestoreapi does not merge the update with existing data —
    // the response only contains the id plus whatever fields were sent.
    const response = await productsApi.update(1, { price: 29.99 });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.price).toBe(29.99);
  });

  test('deletes a product', async ({ productsApi }) => {
    const response = await productsApi.delete(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `npx playwright test tests/products/crud-products.spec.ts`
Expected: `3 passed`.

- [ ] **Step 3: Commit**

```bash
git add tests/products/crud-products.spec.ts
git commit -m "test: add products CRUD tests"
```

---

### Task 4: Products — Negative Tests

**Files:**
- Create: `tests/products/negative-products.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from `src/fixtures/api-fixtures.ts`; `ProductsClient.getById/getByCategory` from Task 2.

- [ ] **Step 1: Write the negative tests**

`tests/products/negative-products.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';

test.describe('Products negative cases', () => {
  test('returns 200 with an empty body for a non-existent product id', async ({ productsApi }) => {
    // Quirk of the mock API: an unknown id does not 404 — it returns
    // status 200 with a completely empty response body.
    const response = await productsApi.getById(999999);
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toBe('');
  });

  test('returns an empty array for an unknown category', async ({ productsApi }) => {
    const response = await productsApi.getByCategory('not-a-real-category');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `npx playwright test tests/products/negative-products.spec.ts`
Expected: `2 passed`.

- [ ] **Step 3: Commit**

```bash
git add tests/products/negative-products.spec.ts
git commit -m "test: add products negative-case tests"
```

---

### Task 5: Carts — Schema, Client, Fixtures, and GET Tests

**Files:**
- Create: `src/schemas/cart.schema.ts`
- Create: `src/clients/carts-client.ts`
- Modify: `src/fixtures/api-fixtures.ts`
- Create: `tests/carts/get-carts.spec.ts`

**Interfaces:**
- Produces: `CartItemSchema`, `CartSchema`, `CartListSchema`, `NewCartSchema`, `CreatedCartSchema`, `Cart` type, `NewCart` type (from `src/schemas/cart.schema.ts`).
- Produces: `CartsClient` class with `getAll()`, `getById(id: number)`, `getByUserId(userId: number)`, `create(payload: NewCart)`, `update(id: number, payload: Partial<NewCart>)`, `delete(id: number)` — all `Promise<APIResponse>`.
- Produces: `cartsApi: CartsClient` fixture added to `src/fixtures/api-fixtures.ts`.

- [ ] **Step 1: Create the cart schema**

`src/schemas/cart.schema.ts`:

```typescript
import { z } from 'zod';

export const CartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
});

export const CartSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(),
  products: z.array(CartItemSchema),
});
export type Cart = z.infer<typeof CartSchema>;
export const CartListSchema = z.array(CartSchema);

export const NewCartSchema = z.object({
  userId: z.number(),
  date: z.string(),
  products: z.array(CartItemSchema),
});
export type NewCart = z.infer<typeof NewCartSchema>;

export const CreatedCartSchema = NewCartSchema.extend({ id: z.number() });
```

- [ ] **Step 2: Create the carts client**

`src/clients/carts-client.ts`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';
import type { NewCart } from '../schemas/cart.schema';

export class CartsClient extends BaseClient {
  async getAll(): Promise<APIResponse> {
    return this.request.get('/carts');
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/carts/${id}`);
  }

  async getByUserId(userId: number): Promise<APIResponse> {
    return this.request.get(`/carts/user/${userId}`);
  }

  async create(payload: NewCart): Promise<APIResponse> {
    return this.request.post('/carts', { data: payload });
  }

  async update(id: number, payload: Partial<NewCart>): Promise<APIResponse> {
    return this.request.put(`/carts/${id}`, { data: payload });
  }

  async delete(id: number): Promise<APIResponse> {
    return this.request.delete(`/carts/${id}`);
  }
}
```

- [ ] **Step 3: Modify the fixtures file to add `cartsApi`**

Replace the full contents of `src/fixtures/api-fixtures.ts` with:

```typescript
import { test as base } from '@playwright/test';
import { ProductsClient } from '../clients/products-client';
import { CartsClient } from '../clients/carts-client';

export type ApiFixtures = {
  productsApi: ProductsClient;
  cartsApi: CartsClient;
};

export const test = base.extend<ApiFixtures>({
  productsApi: async ({ request }, use) => {
    await use(new ProductsClient(request));
  },
  cartsApi: async ({ request }, use) => {
    await use(new CartsClient(request));
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 4: Write the GET tests**

`tests/carts/get-carts.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';
import { CartListSchema, CartSchema } from '../../src/schemas/cart.schema';

test.describe('GET /carts', () => {
  test('returns a list of carts matching the schema', { tag: '@smoke' }, async ({ cartsApi }) => {
    const response = await cartsApi.getAll();
    expect(response.status()).toBe(200);

    const body = await response.json();
    const carts = CartListSchema.parse(body);
    expect(carts.length).toBeGreaterThan(0);
  });

  test('returns a single cart by id', { tag: '@smoke' }, async ({ cartsApi }) => {
    const response = await cartsApi.getById(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const cart = CartSchema.parse(body);
    expect(cart.id).toBe(1);
  });

  test('returns carts for a given user', async ({ cartsApi }) => {
    const response = await cartsApi.getByUserId(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const carts = CartListSchema.parse(body);
    for (const cart of carts) {
      expect(cart.userId).toBe(1);
    }
  });
});
```

- [ ] **Step 5: Run all products and carts tests to verify nothing broke and the new tests pass**

Run: `npx playwright test tests/products tests/carts`
Expected: `12 passed` (4 + 3 + 2 products tests, 3 carts tests).

- [ ] **Step 6: Commit**

```bash
git add src/schemas/cart.schema.ts src/clients/carts-client.ts src/fixtures/api-fixtures.ts tests/carts/get-carts.spec.ts
git commit -m "feat: add carts client, schema, fixtures, and GET tests"
```

---

### Task 6: Carts — CRUD and Negative Tests

**Files:**
- Create: `tests/carts/crud-negative-carts.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from fixtures; `CreatedCartSchema`, `NewCart` from `src/schemas/cart.schema.ts`; `CartsClient.create/update/delete/getById` from Task 5.

- [ ] **Step 1: Write the CRUD and negative tests**

`tests/carts/crud-negative-carts.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';
import { CreatedCartSchema } from '../../src/schemas/cart.schema';
import type { NewCart } from '../../src/schemas/cart.schema';

test.describe('Carts CRUD', () => {
  const newCart: NewCart = {
    userId: 1,
    date: '2024-01-01',
    products: [{ productId: 1, quantity: 2 }],
  };

  test('creates a new cart', async ({ cartsApi }) => {
    const response = await cartsApi.create(newCart);
    expect(response.status()).toBe(201);

    const body = await response.json();
    const created = CreatedCartSchema.parse(body);
    expect(created.userId).toBe(newCart.userId);
  });

  test('updates an existing cart', async ({ cartsApi }) => {
    const response = await cartsApi.update(1, { products: [{ productId: 1, quantity: 5 }] });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.products).toEqual([{ productId: 1, quantity: 5 }]);
  });

  test('deletes a cart', async ({ cartsApi }) => {
    const response = await cartsApi.delete(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
  });
});

test.describe('Carts negative cases', () => {
  test('returns null for a non-existent cart id', async ({ cartsApi }) => {
    // Unlike products, carts return literal `null` (not an empty body)
    // for an unknown id.
    const response = await cartsApi.getById(999999);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `npx playwright test tests/carts/crud-negative-carts.spec.ts`
Expected: `4 passed`.

- [ ] **Step 3: Commit**

```bash
git add tests/carts/crud-negative-carts.spec.ts
git commit -m "test: add carts CRUD and negative-case tests"
```

---

### Task 7: Users — Schema, Client, Fixtures, and GET Tests

**Files:**
- Create: `src/schemas/user.schema.ts`
- Create: `src/clients/users-client.ts`
- Modify: `src/fixtures/api-fixtures.ts`
- Create: `tests/users/get-users.spec.ts`

**Interfaces:**
- Produces: `GeolocationSchema`, `AddressSchema`, `NameSchema`, `UserSchema`, `UserListSchema`, `NewUserSchema`, `User` type, `NewUser` type (from `src/schemas/user.schema.ts`).
- Produces: `UsersClient` class with `getAll()`, `getById(id: number)`, `create(payload: NewUser)`, `update(id: number, payload: Partial<NewUser>)`, `delete(id: number)` — all `Promise<APIResponse>`.
- Produces: `usersApi: UsersClient` fixture added to `src/fixtures/api-fixtures.ts`.

- [ ] **Step 1: Create the user schema**

`src/schemas/user.schema.ts`:

```typescript
import { z } from 'zod';

export const GeolocationSchema = z.object({
  lat: z.string(),
  long: z.string(),
});

export const AddressSchema = z.object({
  city: z.string(),
  street: z.string(),
  number: z.number(),
  zipcode: z.string(),
  geolocation: GeolocationSchema,
});

export const NameSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
});

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
  name: NameSchema,
  address: AddressSchema,
  phone: z.string(),
});
export type User = z.infer<typeof UserSchema>;
export const UserListSchema = z.array(UserSchema);

export const NewUserSchema = z.object({
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
  name: NameSchema,
  address: AddressSchema,
  phone: z.string(),
});
export type NewUser = z.infer<typeof NewUserSchema>;
```

- [ ] **Step 2: Create the users client**

`src/clients/users-client.ts`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';
import type { NewUser } from '../schemas/user.schema';

export class UsersClient extends BaseClient {
  async getAll(): Promise<APIResponse> {
    return this.request.get('/users');
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/users/${id}`);
  }

  async create(payload: NewUser): Promise<APIResponse> {
    return this.request.post('/users', { data: payload });
  }

  async update(id: number, payload: Partial<NewUser>): Promise<APIResponse> {
    return this.request.put(`/users/${id}`, { data: payload });
  }

  async delete(id: number): Promise<APIResponse> {
    return this.request.delete(`/users/${id}`);
  }
}
```

- [ ] **Step 3: Modify the fixtures file to add `usersApi`**

Replace the full contents of `src/fixtures/api-fixtures.ts` with:

```typescript
import { test as base } from '@playwright/test';
import { ProductsClient } from '../clients/products-client';
import { CartsClient } from '../clients/carts-client';
import { UsersClient } from '../clients/users-client';

export type ApiFixtures = {
  productsApi: ProductsClient;
  cartsApi: CartsClient;
  usersApi: UsersClient;
};

export const test = base.extend<ApiFixtures>({
  productsApi: async ({ request }, use) => {
    await use(new ProductsClient(request));
  },
  cartsApi: async ({ request }, use) => {
    await use(new CartsClient(request));
  },
  usersApi: async ({ request }, use) => {
    await use(new UsersClient(request));
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 4: Write the GET tests**

`tests/users/get-users.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';
import { UserListSchema, UserSchema } from '../../src/schemas/user.schema';

test.describe('GET /users', () => {
  test('returns a list of users matching the schema', { tag: '@smoke' }, async ({ usersApi }) => {
    const response = await usersApi.getAll();
    expect(response.status()).toBe(200);

    const body = await response.json();
    const users = UserListSchema.parse(body);
    expect(users.length).toBeGreaterThan(0);
  });

  test('returns a single user by id', { tag: '@smoke' }, async ({ usersApi }) => {
    const response = await usersApi.getById(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const user = UserSchema.parse(body);
    expect(user.id).toBe(1);
  });
});
```

- [ ] **Step 5: Run the full suite so far to verify nothing broke**

Run: `npx playwright test tests/products tests/carts tests/users`
Expected: `18 passed` (9 products + 4 carts + 2 users... wait, count carefully: 4+3+2 products = 9, 3+4 carts = 7, 2 users = 2 → `18 passed`).

- [ ] **Step 6: Commit**

```bash
git add src/schemas/user.schema.ts src/clients/users-client.ts src/fixtures/api-fixtures.ts tests/users/get-users.spec.ts
git commit -m "feat: add users client, schema, fixtures, and GET tests"
```

---

### Task 8: Users — CRUD and Negative Tests

**Files:**
- Create: `tests/users/crud-negative-users.spec.ts`

**Interfaces:**
- Consumes: `test`/`expect` from fixtures; `NewUser` type from `src/schemas/user.schema.ts`; `UsersClient.create/update/delete/getById` from Task 7.

- [ ] **Step 1: Write the CRUD and negative tests**

`tests/users/crud-negative-users.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';
import type { NewUser } from '../../src/schemas/user.schema';

test.describe('Users CRUD', () => {
  const newUser: NewUser = {
    email: 'test@test.com',
    username: 'testuser',
    password: 'testpass',
    name: { firstname: 'Test', lastname: 'User' },
    address: {
      city: 'City',
      street: 'Street',
      number: 1,
      zipcode: '12345',
      geolocation: { lat: '0', long: '0' },
    },
    phone: '123-456-7890',
  };

  test('creates a new user', async ({ usersApi }) => {
    // fakestoreapi only echoes back the new id on user creation,
    // not the rest of the submitted payload.
    const response = await usersApi.create(newUser);
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(typeof body.id).toBe('number');
  });

  test('updates an existing user', async ({ usersApi }) => {
    const response = await usersApi.update(1, { email: 'updated@test.com' });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.email).toBe('updated@test.com');
  });

  test('deletes a user', async ({ usersApi }) => {
    const response = await usersApi.delete(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
  });
});

test.describe('Users negative cases', () => {
  test('returns null for a non-existent user id', async ({ usersApi }) => {
    const response = await usersApi.getById(999999);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and verify they pass**

Run: `npx playwright test tests/users/crud-negative-users.spec.ts`
Expected: `4 passed`.

- [ ] **Step 3: Commit**

```bash
git add tests/users/crud-negative-users.spec.ts
git commit -m "test: add users CRUD and negative-case tests"
```

---

### Task 9: Auth — Schema, Client, Fixtures, and Login Tests

**Files:**
- Create: `src/schemas/auth.schema.ts`
- Create: `src/clients/auth-client.ts`
- Modify: `src/fixtures/api-fixtures.ts`
- Create: `tests/auth/login.spec.ts`

**Interfaces:**
- Produces: `LoginResponseSchema`, `LoginResponse` type (from `src/schemas/auth.schema.ts`).
- Produces: `AuthClient` class with `login(payload: LoginPayload): Promise<APIResponse>`; `LoginPayload` interface `{ username: string; password: string }`.
- Produces: `authApi: AuthClient` fixture added to `src/fixtures/api-fixtures.ts`.
- Consumes: `ProductsClient.getAll(options?: { headers?: Record<string, string> })` from Task 2, for the token-propagation test.

- [ ] **Step 1: Create the auth schema**

`src/schemas/auth.schema.ts`:

```typescript
import { z } from 'zod';

export const LoginResponseSchema = z.object({
  token: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
```

- [ ] **Step 2: Create the auth client**

`src/clients/auth-client.ts`:

```typescript
import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';

export interface LoginPayload {
  username: string;
  password: string;
}

export class AuthClient extends BaseClient {
  async login(payload: LoginPayload): Promise<APIResponse> {
    return this.request.post('/auth/login', { data: payload });
  }
}
```

- [ ] **Step 3: Modify the fixtures file to add `authApi`**

Replace the full contents of `src/fixtures/api-fixtures.ts` with:

```typescript
import { test as base } from '@playwright/test';
import { ProductsClient } from '../clients/products-client';
import { CartsClient } from '../clients/carts-client';
import { UsersClient } from '../clients/users-client';
import { AuthClient } from '../clients/auth-client';

export type ApiFixtures = {
  productsApi: ProductsClient;
  cartsApi: CartsClient;
  usersApi: UsersClient;
  authApi: AuthClient;
};

export const test = base.extend<ApiFixtures>({
  productsApi: async ({ request }, use) => {
    await use(new ProductsClient(request));
  },
  cartsApi: async ({ request }, use) => {
    await use(new CartsClient(request));
  },
  usersApi: async ({ request }, use) => {
    await use(new UsersClient(request));
  },
  authApi: async ({ request }, use) => {
    await use(new AuthClient(request));
  },
});

export { expect } from '@playwright/test';
```

- [ ] **Step 4: Write the login tests**

`tests/auth/login.spec.ts`:

```typescript
import { test, expect } from '../../src/fixtures/api-fixtures';
import { LoginResponseSchema } from '../../src/schemas/auth.schema';

test.describe('POST /auth/login', () => {
  test('logs in with valid credentials and returns a token', { tag: '@smoke' }, async ({ authApi }) => {
    const response = await authApi.login({ username: 'mor_2314', password: '83r5^_' });
    expect(response.status()).toBe(201);

    const body = await response.json();
    const { token } = LoginResponseSchema.parse(body);
    expect(token.length).toBeGreaterThan(0);
  });

  test('rejects invalid credentials with a 401', async ({ authApi }) => {
    // The error body here is plain text, not JSON.
    const response = await authApi.login({ username: 'not-a-real-user', password: 'wrong-password' });
    expect(response.status()).toBe(401);

    const body = await response.text();
    expect(body.toLowerCase()).toContain('incorrect');
  });

  test('propagates the login token as a Bearer header on a subsequent request', async ({ authApi, productsApi }) => {
    const loginResponse = await authApi.login({ username: 'mor_2314', password: '83r5^_' });
    const { token } = LoginResponseSchema.parse(await loginResponse.json());

    const response = await productsApi.getAll({ headers: { Authorization: `Bearer ${token}` } });
    expect(response.status()).toBe(200);
  });
});
```

- [ ] **Step 5: Run the full suite to verify everything passes together**

Run: `npx playwright test`
Expected: `25 passed` (9 products + 7 carts + 6 users + 3 auth).

- [ ] **Step 6: Commit**

```bash
git add src/schemas/auth.schema.ts src/clients/auth-client.ts src/fixtures/api-fixtures.ts tests/auth/login.spec.ts
git commit -m "feat: add auth client, schema, fixtures, and login tests"
```

---

### Task 10: GitHub Actions CI

**Files:**
- Create: `.github/workflows/playwright.yml`

**Interfaces:**
- Consumes: `npm test` script from Task 1's `package.json`.

- [ ] **Step 1: Create the workflow**

`.github/workflows/playwright.yml`:

```yaml
name: Playwright API Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Playwright API tests
        run: npx playwright test

      - name: Upload HTML report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

Note: no `playwright install` step is needed — these tests use `APIRequestContext` only, never a browser `page`, so no browser binaries need to be downloaded. This keeps CI fast.

- [ ] **Step 2: Verify the workflow YAML is syntactically valid**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/playwright.yml'))" && echo OK`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/playwright.yml
git commit -m "ci: add GitHub Actions workflow for Playwright API tests"
```

---

### Task 11: README

**Files:**
- Create: `README.md`

**Interfaces:**
- None (documentation only).

- [ ] **Step 1: Write the README**

`README.md`:

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README"
```
