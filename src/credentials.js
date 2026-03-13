import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { refreshAccessToken } from './oauth.js';

const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // refresh 1 minute before expiry

export const CREDENTIALS_PATH = join(homedir(), '.config', 'apollo', 'credentials');

export function saveOAuthCredentials({ clientId, access_token, refresh_token, expires_in }) {
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true, mode: 0o700 });
  writeFileSync(CREDENTIALS_PATH, JSON.stringify({
    type: 'oauth',
    access_token,
    refresh_token,
    client_id: clientId,
    expires_at: expires_in ? Date.now() + expires_in * 1000 : null,
  }), { mode: 0o600 });
}

export function loadCredentials() {
  if (!existsSync(CREDENTIALS_PATH)) return null;
  return JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
}

export async function getValidCredentials() {
  const creds = loadCredentials();
  if (!creds) return null;

  const isExpired = creds.expires_at && Date.now() >= creds.expires_at - TOKEN_EXPIRY_BUFFER_MS;
  if (!isExpired) return creds;

  if (!creds.refresh_token) return creds;

  const tokens = await refreshAccessToken(creds.refresh_token, creds.client_id);
  saveOAuthCredentials({ clientId: creds.client_id, ...tokens });
  return loadCredentials();
}

export function clearCredentials() {
  if (existsSync(CREDENTIALS_PATH)) unlinkSync(CREDENTIALS_PATH);
}
