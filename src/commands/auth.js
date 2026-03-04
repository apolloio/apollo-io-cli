import { mkdirSync, writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const CREDENTIALS_PATH = join(homedir(), '.config', 'apollo', 'credentials');

export function registerAuth(program) {
  const auth = program.command('auth').description('Manage Apollo.io credentials');

  auth
    .command('login <api-key>')
    .description('Save an API key to ~/.config/apollo/credentials')
    .action((apiKey) => {
      mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true });
      writeFileSync(CREDENTIALS_PATH, apiKey, { mode: 0o600 });
      console.log(`Saved API key to ${CREDENTIALS_PATH}`);
    });

  auth
    .command('logout')
    .description('Remove saved credentials')
    .action(() => {
      if (existsSync(CREDENTIALS_PATH)) {
        unlinkSync(CREDENTIALS_PATH);
        console.log('Credentials removed.');
      } else {
        console.log('No credentials found.');
      }
    });

  auth
    .command('whoami')
    .description('Show which API key is active')
    .action(() => {
      if (process.env.APOLLO_API_KEY) {
        console.log(`APOLLO_API_KEY env var (${process.env.APOLLO_API_KEY.slice(0, 8)}...)`);
      } else if (existsSync(CREDENTIALS_PATH)) {
        const key = readFileSync(CREDENTIALS_PATH, 'utf8').trim();
        console.log(`~/.config/apollo/credentials (${key.slice(0, 8)}...)`);
      } else {
        console.log('No credentials found.');
      }
    });
}
