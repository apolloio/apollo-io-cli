import type { Command } from 'commander';
import { saveOAuthCredentials, clearCredentials, loadCredentials } from '../credentials.js';
import { oauthLogin, revokeToken } from '../oauth.js';
import { apolloGet } from '../api.js';

export function registerAuth(program: Command): void {
  const auth = program.command('auth').description('Manage Apollo.io credentials');

  auth
    .command('login')
    .description('Log in to Apollo.io via browser')
    .action(async () => {
      try {
        const tokens = await oauthLogin();
        saveOAuthCredentials(tokens);
        console.log('Successfully logged in.');
        process.exit(0);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Login failed: ${message}`);
        process.exit(1);
      }
    });

  auth
    .command('logout')
    .description('Remove saved credentials')
    .action(async () => {
      const creds = loadCredentials();
      if (!creds) {
        console.log('No credentials found.');
        return;
      }
      if (creds.type === 'oauth' && creds.access_token) {
        await revokeToken(creds.access_token, creds.client_id).catch(() => {});
      }
      clearCredentials();
      console.log('Logged out.');
    });

  auth
    .command('whoami')
    .description('Show the currently authenticated user')
    .action(async () => {
      const creds = loadCredentials();
      if (!creds) {
        console.log('Not logged in.');
        return;
      }
      const data = await apolloGet('/users/api_profile') as { user?: { name?: string; email?: string } };
      const { name, email } = data.user ?? {};
      console.log(`Logged in as ${name ?? 'unknown'} (${email ?? 'unknown'})`);
    });
}
