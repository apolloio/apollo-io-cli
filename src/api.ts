import { getValidCredentials } from './credentials.js';
import type { ApolloJson } from './types.js';

const BASE_URL = 'https://api.apollo.io/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const creds = await getValidCredentials();
  if (!creds) {
    console.error('Not logged in. Run: apollo auth login');
    process.exit(1);
  }
  if (creds.expires_at !== null && Date.now() >= creds.expires_at) {
    console.error('Session expired. Run: apollo auth login');
    process.exit(1);
  }
  return { 'Authorization': `Bearer ${creds.access_token}` };
}

export type QueryParams = Record<string, string | number | boolean | string[] | number[] | undefined | null>;

export async function apolloGet<T = ApolloJson>(path: string, params: QueryParams = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(`${key}[]`, String(v));
    } else if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Cache-Control': 'no-cache',
      'User-Agent': 'apollo-io-cli/1.0',
      ...await getAuthHeaders(),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Apollo API error ${res.status}: ${text}`);
    process.exit(1);
  }
  return await res.json() as T;
}

export async function apolloRequest<T = ApolloJson>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'apollo-io-cli/1.0',
      ...await getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Apollo API error ${res.status}: ${text}`);
    process.exit(1);
  }

  return await res.json() as T;
}
