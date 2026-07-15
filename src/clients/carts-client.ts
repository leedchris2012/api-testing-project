import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';
import type { NewCart } from '../schemas/cart.schema';

export class CartsClient extends BaseClient {
  async getAll(): Promise<APIResponse> {
    return this.request.get('/carts');
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/carts/${id}`);
  }

  async getByUserId(userId: number): Promise<APIResponse> {
    return this.request.get(`/carts/user/${userId}`);
  }

  async create(payload: NewCart): Promise<APIResponse> {
    return this.request.post('/carts', { data: payload });
  }

  async update(id: number, payload: Partial<NewCart>): Promise<APIResponse> {
    return this.request.put(`/carts/${id}`, { data: payload });
  }

  async delete(id: number): Promise<APIResponse> {
    return this.request.delete(`/carts/${id}`);
  }
}
