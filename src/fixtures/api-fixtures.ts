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
