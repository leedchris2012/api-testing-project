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
