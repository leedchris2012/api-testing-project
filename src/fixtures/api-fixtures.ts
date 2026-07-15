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
