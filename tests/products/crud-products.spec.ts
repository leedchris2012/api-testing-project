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

  // Checks that adding a brand-new product through the API works, and that
  // the product we get back has the same name and price we submitted.
  test('creates a new product', async ({ productsApi }) => {
    const response = await productsApi.create(newProduct);
    expect(response.status()).toBe(201);

    const body = await response.json();
    const created = CreatedProductSchema.parse(body);
    expect(created.title).toBe(newProduct.title);
    expect(created.price).toBe(newProduct.price);
  });

  // Checks that editing an existing product (changing its price) is
  // accepted and the new price is reflected in the response.
  test('updates an existing product', async ({ productsApi }) => {
    // fakestoreapi does not merge the update with existing data —
    // the response only contains the id plus whatever fields were sent.
    const response = await productsApi.update(1, { price: 29.99 });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.price).toBe(29.99);
  });

  // Checks that removing a product through the API succeeds.
  test('deletes a product', async ({ productsApi }) => {
    const response = await productsApi.delete(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
  });
});
