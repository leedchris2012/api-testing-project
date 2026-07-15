import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';
import type { NewUser } from '../schemas/user.schema';

export class UsersClient extends BaseClient {
  async getAll(): Promise<APIResponse> {
    return this.request.get('/users');
  }

  async getById(id: number): Promise<APIResponse> {
    return this.request.get(`/users/${id}`);
  }

  async create(payload: NewUser): Promise<APIResponse> {
    return this.request.post('/users', { data: payload });
  }

  async update(id: number, payload: Partial<NewUser>): Promise<APIResponse> {
    return this.request.put(`/users/${id}`, { data: payload });
  }

  async delete(id: number): Promise<APIResponse> {
    return this.request.delete(`/users/${id}`);
  }
}
