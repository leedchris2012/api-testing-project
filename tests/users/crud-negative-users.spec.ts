import { test, expect } from '../../src/fixtures/api-fixtures';
import type { NewUser } from '../../src/schemas/user.schema';

test.describe('Users CRUD', () => {
  const newUser: NewUser = {
    email: 'test@test.com',
    username: 'testuser',
    password: 'testpass',
    name: { firstname: 'Test', lastname: 'User' },
    address: {
      city: 'City',
      street: 'Street',
      number: 1,
      zipcode: '12345',
      geolocation: { lat: '0', long: '0' },
    },
    phone: '123-456-7890',
  };

  // Checks that signing up a new user (with name, email, address, etc.)
  // successfully creates their account.
  test('creates a new user', async ({ usersApi }) => {
    // fakestoreapi only echoes back the new id on user creation,
    // not the rest of the submitted payload.
    const response = await usersApi.create(newUser);
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(typeof body.id).toBe('number');
  });

  // Checks that updating a user's information (e.g. changing their
  // email address) saves correctly.
  test('updates an existing user', async ({ usersApi }) => {
    const response = await usersApi.update(1, { email: 'updated@test.com' });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.email).toBe('updated@test.com');
  });

  // Checks that removing a user account through the API succeeds.
  test('deletes a user', async ({ usersApi }) => {
    const response = await usersApi.delete(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
  });
});

test.describe('Users negative cases', () => {
  // Checks what happens when someone asks for a user account that
  // doesn't exist — confirms the app responds gracefully instead of
  // erroring out.
  test('returns null for a non-existent user id', async ({ usersApi }) => {
    const response = await usersApi.getById(999999);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeNull();
  });
});
