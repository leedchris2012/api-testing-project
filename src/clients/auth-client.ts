import { APIResponse } from '@playwright/test';
import { BaseClient } from './base-client';

export interface LoginPayload {
  username: string;
  password: string;
}

export class AuthClient extends BaseClient {
  async login(payload: LoginPayload): Promise<APIResponse> {
    return this.request.post('/auth/login', { data: payload });
  }
}
