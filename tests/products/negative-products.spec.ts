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
