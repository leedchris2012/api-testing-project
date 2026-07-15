import { test, expect } from '../../src/fixtures/api-fixtures';
import { ProductListSchema, ProductSchema } from '../../src/schemas/product.schema';

test.describe('GET /products', () => {
  // Checks that fetching the full product catalog works and that every
  // product in the list has the fields we expect (name, price, etc.).
  test('returns a list of products matching the schema', { tag: '@smoke' }, async ({ productsApi }) => {
    const response = await productsApi.getAll();
    expect(response.status()).toBe(200);

    const body = await response.json();
    const products = ProductListSchema.parse(body);
    expect(products.length).toBeGreaterThan(0);
  });

  // Checks that looking up one specific product by its id returns the
  // correct product.
  test('returns a single product by id', { tag: '@smoke' }, async ({ productsApi }) => {
    const response = await productsApi.getById(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const product = ProductSchema.parse(body);
    expect(product.id).toBe(1);
  });

  // Checks that filtering products by category (e.g. "men's clothing")
  // only returns products that actually belong to that category.
  test('returns products filtered by category', async ({ productsApi }) => {
    const response = await productsApi.getByCategory("men's clothing");
    expect(response.status()).toBe(200);

    const body = await response.json();
    const products = ProductListSchema.parse(body);
    for (const product of products) {
      expect(product.category).toBe("men's clothing");
    }
  });

  // Checks that the list of product categories shown to shoppers includes
  // all the categories we expect to see (electronics, jewelry, clothing).
  test('returns the list of available categories', async ({ productsApi }) => {
    const response = await productsApi.getCategories();
    expect(response.status()).toBe(200);

    const body: string[] = await response.json();
    expect(body).toEqual(
      expect.arrayContaining(['electronics', 'jewelery', "men's clothing", "women's clothing"])
    );
  });
});
