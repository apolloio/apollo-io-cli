import { loadCredentials } from './credentials.js';

const BASE_URL = 'https://api.apollo.io/api/v1';

function getAuthHeaders() {
  const creds = loadCredentials();
  if (!creds) {
    console.error('Not logged in. Run: apollo auth login');
    process.exit(1);
  }
  if (creds.expires_at && Date.now() >= creds.expires_at) {
    console.error('Session expired. Run: apollo auth login');
    process.exit(1);
  }
  return { 'Authorization': `Bearer ${creds.access_token}` };
}

export async function apolloRequest(path, body = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'apollo-io-cli/1.0',
      ...getAuthHeaders(),
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
