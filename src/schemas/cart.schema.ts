import { z } from 'zod';

export const CartItemSchema = z.object({
  productId: z.number(),
  quantity: z.number(),
});

export const CartSchema = z.object({
  id: z.number(),
  userId: z.number(),
  date: z.string(),
  products: z.array(CartItemSchema),
});
export type Cart = z.infer<typeof CartSchema>;
export const CartListSchema = z.array(CartSchema);

export const NewCartSchema = z.object({
  userId: z.number(),
  date: z.string(),
  products: z.array(CartItemSchema),
});
export type NewCart = z.infer<typeof NewCartSchema>;

export const CreatedCartSchema = NewCartSchema.extend({ id: z.number() });
