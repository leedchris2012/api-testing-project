import { test, expect } from '../../src/fixtures/api-fixtures';
import { UserListSchema, UserSchema } from '../../src/schemas/user.schema';

test.describe('GET /users', () => {
  // Checks that fetching the full list of registered users works and
  // that each user record has the fields we expect (name, email, etc.).
  test('returns a list of users matching the schema', { tag: '@smoke' }, async ({ usersApi }) => {
    const response = await usersApi.getAll();
    expect(response.status()).toBe(200);

    const body = await response.json();
    const users = UserListSchema.parse(body);
    expect(users.length).toBeGreaterThan(0);
  });

  // Checks that looking up one specific user by their id returns the
  // correct person's information.
  test('returns a single user by id', { tag: '@smoke' }, async ({ usersApi }) => {
    const response = await usersApi.getById(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const user = UserSchema.parse(body);
    expect(user.id).toBe(1);
  });
});
