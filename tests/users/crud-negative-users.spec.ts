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

  test('creates a new user', async ({ usersApi }) => {
    // fakestoreapi only echoes back the new id on user creation,
    // not the rest of the submitted payload.
    const response = await usersApi.create(newUser);
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(typeof body.id).toBe('number');
  });

  test('updates an existing user', async ({ usersApi }) => {
    const response = await usersApi.update(1, { email: 'updated@test.com' });
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.email).toBe('updated@test.com');
  });

  test('deletes a user', async ({ usersApi }) => {
    const response = await usersApi.delete(1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.id).toBe(1);
  });
});

test.describe('Users negative cases', () => {
  test('returns null for a non-existent user id', async ({ usersApi }) => {
    const response = await usersApi.getById(999999);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toBeNull();
  });
});
