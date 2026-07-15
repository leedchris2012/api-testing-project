import { test, expect } from '../../src/fixtures/api-fixtures';
import { LoginResponseSchema } from '../../src/schemas/auth.schema';

test.describe('POST /auth/login', () => {
  test('logs in with valid credentials and returns a token', { tag: '@smoke' }, async ({ authApi }) => {
    const response = await authApi.login({ username: 'mor_2314', password: '83r5^_' });
    expect(response.status()).toBe(201);

    const body = await response.json();
    const { token } = LoginResponseSchema.parse(body);
    expect(token.length).toBeGreaterThan(0);
  });

  test('rejects invalid credentials with a 401', async ({ authApi }) => {
    // The error body here is plain text, not JSON.
    const response = await authApi.login({ username: 'not-a-real-user', password: 'wrong-password' });
    expect(response.status()).toBe(401);

    const body = await response.text();
    expect(body.toLowerCase()).toContain('incorrect');
  });

  test('propagates the login token as a Bearer header on a subsequent request', async ({ authApi, productsApi }) => {
    const loginResponse = await authApi.login({ username: 'mor_2314', password: '83r5^_' });
    const { token } = LoginResponseSchema.parse(await loginResponse.json());

    const response = await productsApi.getAll({ headers: { Authorization: `Bearer ${token}` } });
    expect(response.status()).toBe(200);
  });
});
