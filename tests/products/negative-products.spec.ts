import { test, expect } from '../../src/fixtures/api-fixtures';

test.describe('Products negative cases', () => {
  // Checks what happens when someone asks for a product that doesn't
  // exist (id 999999) — confirms the app doesn't crash or return an error.
  test('returns 200 with an empty body for a non-existent product id', async ({ productsApi }) => {
    // Quirk of the mock API: an unknown id does not 404 — it returns
    // status 200 with a completely empty response body.
    const response = await productsApi.getById(999999);
    expect(response.status()).toBe(200);

    const body = await response.text();
    expect(body).toBe('');
  });

  // Checks that searching for products in a category that doesn't exist
  // returns an empty list instead of an error.
  test('returns an empty array for an unknown category', async ({ productsApi }) => {
    const response = await productsApi.getByCategory('not-a-real-category');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toEqual([]);
  });
});
