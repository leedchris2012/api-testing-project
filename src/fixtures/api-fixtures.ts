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
