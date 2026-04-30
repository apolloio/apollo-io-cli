import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { refreshAccessToken } from './oauth.js';
import type { Credentials, OAuthTokenResponse } from './types.js';

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;
const CREDENTIALS_PATH = join(homedir(), '.config', 'apollo', 'credentials');

interface SaveOAuthArgs {
  clientId: string;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export function saveOAuthCredentials({ clientId, access_token, refresh_token, expires_in }: SaveOAuthArgs): void {
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true, mode: 0o700 });
  const payload: Credentials = {
    type: 'oauth',
    access_token,
    refresh_token,
    client_id: clientId,
    expires_at: expires_in ? Date.now() + expires_in * 1000 : null,
  };
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(payload), { mode: 0o600 });
}

function isCredentials(value: unknown): value is Credentials {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === 'oauth' &&
    typeof v.access_token === 'string' &&
    typeof v.refresh_token === 'string' &&
    typeof v.client_id === 'string' &&
    (v.expires_at === null || typeof v.expires_at === 'number')
  );
}

export function loadCredentials(): Credentials | null {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  const parsed: unknown = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
  return isCredentials(parsed) ? parsed : null;
}

export async function getValidCredentials(): Promise<Credentials | null> {
  const creds = loadCredentials();
  if (!creds) return null;

  const isExpired = creds.expires_at !== null && Date.now() >= creds.expires_at - TOKEN_EXPIRY_BUFFER_MS;
  if (!isExpired) return creds;

  if (!creds.refresh_token) return creds;

  try {
    const refreshed: OAuthTokenResponse = await refreshAccessToken(creds.refresh_token, creds.client_id);
    saveOAuthCredentials({
      clientId: creds.client_id,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_in: refreshed.expires_in,
    });
    return loadCredentials();
  } catch {
    console.error('Session expired. Run: apollo auth login');
    process.exit(1);
  }
}

export function clearCredentials(): void {
  if (existsSync(CREDENTIALS_PATH)) unlinkSync(CREDENTIALS_PATH);
}
