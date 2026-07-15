import { z } from 'zod';

export const GeolocationSchema = z.object({
  lat: z.string(),
  long: z.string(),
});

export const AddressSchema = z.object({
  city: z.string(),
  street: z.string(),
  number: z.number(),
  zipcode: z.string(),
  geolocation: GeolocationSchema,
});

export const NameSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
});

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
  name: NameSchema,
  address: AddressSchema,
  phone: z.string(),
});
export type User = z.infer<typeof UserSchema>;
export const UserListSchema = z.array(UserSchema);

export const NewUserSchema = z.object({
  email: z.string().email(),
  username: z.string(),
  password: z.string(),
  name: NameSchema,
  address: AddressSchema,
  phone: z.string(),
});
export type NewUser = z.infer<typeof NewUserSchema>;
