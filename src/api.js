import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CREDENTIALS_PATH = join(homedir(), '.config', 'apollo', 'credentials');
const BASE_URL = 'https://api.apollo.io/api/v1';

function getApiKey() {
  if (process.env.APOLLO_API_KEY) return process.env.APOLLO_API_KEY;

  if (existsSync(CREDENTIALS_PATH)) {
    return readFileSync(CREDENTIALS_PATH, 'utf8').trim();
  }

  console.error('No API key found. Run: apollo auth login <api-key>');
  process.exit(1);
}

export async function apolloRequest(path, body = {}) {
  const apiKey = getApiKey();

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Apollo API error ${res.status}: ${text}`);
    process.exit(1);
  }

  return res.json();
}
