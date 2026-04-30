import http from 'http';
import crypto from 'crypto';
import { spawnSync } from 'child_process';

const APOLLO_MCP_BASE = 'https://mcp.apollo.io';
const REDIRECT_PORT = 3421;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPES = [
  'people_bulk_match', 'organizations_bulk_enrich', 'organizations_enrich', 'people_match',
  'mixed_people_search', 'mixed_people_api_search', 'organizations_job_posting',
  'mixed_companies_search', 'organizations_news_articles',
  'contact_write', 'contact_update', 'contacts_search', 'contact_read', 'contacts_bulk_create',
  'account_write', 'account_update', 'account_bulk_create',
  'emailer_campaigns_search', 'emailer_campaigns_add_contact_ids', 'emailer_campaigns_remove_or_stop_contact_ids',
  'email_accounts_list', 'read_user_profile', 'users_list',
  'opportunity_write', 'opportunities_list', 'opportunity_read',
  'phone_call_write', 'phone_call_search', 'phone_call_update',
  'tasks_create', 'tasks_list',
  'report_sync', 'credit_usage_stats_read',
].join(' ');
const TIMEOUT_MS = 5 * 60 * 1000;

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function registerClient() {
  const res = await fetch(`${APOLLO_MCP_BASE}/api/v1/oauth/applications/register_oauth_client`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'apollo-io-cli/1.0' },
    body: JSON.stringify({
      client_name: 'Apollo CLI',
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code'],
      response_types: ['code'],
      scope: SCOPES,
    }),
  });
  if (!res.ok) throw new Error(`Client registration failed: ${await res.text()}`);
  const data = await res.json();
  return data.client_id;
}

async function exchangeCode(code, clientId, verifier) {
  const res = await fetch(`${APOLLO_MCP_BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken, clientId) {
  const res = await fetch(`${APOLLO_MCP_BASE}/api/v1/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return res.json();
}

export async function revokeToken(accessToken, clientId) {
  await fetch(`${APOLLO_MCP_BASE}/api/v1/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: accessToken, client_id: clientId }),
  });
}

function openBrowser(url) {
  if (process.platform === 'darwin') spawnSync('open', [url]);
  else if (process.platform === 'win32') spawnSync('cmd', ['/c', 'start', '', url]);
  else spawnSync('xdg-open', [url]);
}

export async function oauthLogin() {
  const clientId = await registerClient();
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  });

  const authUrl = `${APOLLO_MCP_BASE}/mcp/oauth_metadata/redirect_to_authorize?${params}`;

  return new Promise((resolve, reject) => {
    let settled = false;

    const done = (fn) => {
      if (settled) return;
      settled = true;
      server.close();
      fn();
    };

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (url.pathname !== '/callback') return;

      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><body><h2>Authorization complete. You can close this tab.</h2></body></html>');

      if (error) return done(() => reject(new Error(`Authorization denied: ${error}`)));
      if (returnedState !== state) return done(() => reject(new Error('State mismatch — possible CSRF attack')));
      if (!code) return done(() => reject(new Error('No authorization code received')));

      try {
        const tokens = await exchangeCode(code, clientId, verifier);
        done(() => resolve({ clientId, ...tokens }));
      } catch (err) {
        done(() => reject(err));
      }
    });

    server.on('error', (err) => done(() => reject(err)));

    server.listen(REDIRECT_PORT, '127.0.0.1', () => {
      console.log('Opening browser for Apollo login...');
      try {
        openBrowser(authUrl);
      } catch {
        console.log(`\nCould not open browser automatically. Visit:\n${authUrl}\n`);
      }
      console.log('Waiting for authorization...');
    });

    setTimeout(() => done(() => reject(new Error('Authorization timed out'))), TIMEOUT_MS);
  });
}
