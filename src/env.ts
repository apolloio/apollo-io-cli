const stagingIdx = process.argv.indexOf('--staging');
const STAGING = stagingIdx !== -1;
if (STAGING) process.argv.splice(stagingIdx, 1);

const HOSTS = STAGING
  ? { api: 'https://api.staging-gcp.apollo.io', mcp: 'https://mcp.staging-gcp.apollo.io' }
  : { api: 'https://api.apollo.io', mcp: 'https://mcp.apollo.io' };

export const API_HOST = HOSTS.api;
export const MCP_HOST = HOSTS.mcp;
