import { getValidCredentials } from './credentials.js';

const API_HOST = 'https://api.apollo.io';
const BASE_URL = `${API_HOST}/api/v1`;

// Paths starting with /deals, /analytics, etc. are mounted off the host root,
// not under /api/v1 — let callers opt into root-relative paths with a leading "//".
function resolvePath(path) {
  if (path.startsWith('//')) return `${API_HOST}/${path.slice(2)}`;
  return `${BASE_URL}${path}`;
}

async function getAuthHeaders() {
  const creds = await getValidCredentials();
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

export async function apolloGet(path, params = {}) {
  const url = new URL(resolvePath(path));
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) url.searchParams.append(`${key}[]`, v);
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
  return res.json();
}

export async function apolloRequest(path, body = {}, method = 'POST') {
  const res = await fetch(resolvePath(path), {
    method,
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

  return res.json();
}
