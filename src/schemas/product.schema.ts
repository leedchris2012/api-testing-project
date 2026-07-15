import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  description: z.string(),
  category: z.string(),
  image: z.string().url(),
  rating: z.object({
    rate: z.number(),
    count: z.number(),
  }),
});
export type Product = z.infer<typeof ProductSchema>;
export const ProductListSchema = z.array(ProductSchema);

export const NewProductSchema = z.object({
  title: z.string(),
  price: z.number(),
  description: z.string(),
  image: z.string().url(),
  category: z.string(),
});
export type NewProduct = z.infer<typeof NewProductSchema>;

export const CreatedProductSchema = NewProductSchema.extend({ id: z.number() });
