import { test, expect } from '../../src/fixtures/api-fixtures';
import { CartListSchema, CartSchema } from '../../src/schemas/cart.schema';

test.describe('GET /carts', () => {
  // Checks that fetching every shopping cart in the system works and
  // that each cart has the fields we expect.
  test('returns a list of carts matching the schema', { tag: '@smoke' }, async ({ cartsApi }) => {
    const response = await cartsApi.getAll();
    expect(response.status()).toBe(200);

    const body = await response.json();
    const carts = CartListSchema.parse(body);
    expect(carts.length).toBeGreaterThan(0);
  });

  // Checks that looking up one specific shopping cart by its id returns
  // the correct cart.
  test('returns a single cart by id', { tag: '@smoke' }, async ({ cartsApi }) => {
    const response = await cartsApi.getById(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const cart = CartSchema.parse(body);
    expect(cart.id).toBe(1);
  });

  // Checks that asking for "all carts belonging to user 1" only returns
  // carts that actually belong to that user, not someone else's carts.
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
