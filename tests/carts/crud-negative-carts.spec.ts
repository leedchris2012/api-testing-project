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
