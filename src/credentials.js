import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export const CREDENTIALS_PATH = join(homedir(), '.config', 'apollo', 'credentials');

export function saveOAuthCredentials({ clientId, access_token, refresh_token, expires_in }) {
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true });
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

export function clearCredentials() {
  if (existsSync(CREDENTIALS_PATH)) unlinkSync(CREDENTIALS_PATH);
}
