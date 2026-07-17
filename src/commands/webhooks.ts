import type { Command } from 'commander';
import { apolloGet } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface WebhookResultOptions {
  requestId: string;
  format?: string;
}

export function registerWebhooks(program: Command): void {
  const webhooks = program.command('webhooks').description('Poll results of asynchronous (webhook-based) requests');

  webhooks
    .command('result')
    .description('Poll the stored webhook result for an async request')
    .requiredOption('--request-id <id>', 'Request ID returned by the asynchronous endpoint')
    .option(...FORMAT_OPTION)
    .action(async (opts: WebhookResultOptions) => {
      const data = await apolloGet(`/webhook_result/${opts.requestId}`);
      print(data, opts.format);
    });
}
