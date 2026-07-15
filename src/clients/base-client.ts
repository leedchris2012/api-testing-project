import { APIRequestContext } from '@playwright/test';

export class BaseClient {
  constructor(protected request: APIRequestContext) {}
}
