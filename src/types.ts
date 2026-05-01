export interface Credentials {
  type: 'oauth';
  access_token: string;
  refresh_token: string;
  client_id: string;
  expires_at: number | null;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
}

export interface OAuthLoginResult extends OAuthTokenResponse {
  clientId: string;
}

export type OutputFormat = 'json' | 'jsonl' | 'csv' | 'yaml' | 'table';

export interface PageOptions {
  page: number;
  per_page: number;
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ApolloJson = Record<string, unknown>;
