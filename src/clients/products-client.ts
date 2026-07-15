import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';
import type { NewProduct } from '../schemas/product.schema';

export class ProductsClient extends BaseClient {
  async getAll(options?: { headers?: Record<string, string> }): Promise<APIResponse> {
    return this.request.get('/products', options);
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/products/${id}`);
  }

  async getByCategory(category: string): Promise<APIResponse> {
    return this.request.get(`/products/category/${category}`);
  }

  async getCategories(): Promise<APIResponse> {
    return this.request.get('/products/categories');
  }

  async create(payload: NewProduct): Promise<APIResponse> {
    return this.request.post('/products', { data: payload });
  }

  async update(id: number, payload: Partial<NewProduct>): Promise<APIResponse> {
    return this.request.put(`/products/${id}`, { data: payload });
  }

  async delete(id: number): Promise<APIResponse> {
    return this.request.delete(`/products/${id}`);
  }
}
