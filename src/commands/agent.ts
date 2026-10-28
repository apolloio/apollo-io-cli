import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface AgentRunOptions {
  instruction: string;
  format?: string;
}

interface AgentPollOptions {
  taskId: string;
  cursor?: string;
  format?: string;
}

export function registerAgent(program: Command): void {
  const agent = program
    .command('agent')
    .description('Run and poll Apollo AI Assistant tasks');

  agent
    .command('run')
    .description('Start a new Assistant task (returns immediately; poll with `agent poll`)')
    .requiredOption('--instruction <text>', 'What the Assistant should do, in plain language')
    .option(...FORMAT_OPTION)
    .action(async (opts: AgentRunOptions) => {
      const data = await apolloRequest('/agents/task', { instruction: opts.instruction });
      print(data, opts.format);
    });

  agent
    .command('poll')
    .description('Get the status and messages of an Assistant task')
    .requiredOption('--task-id <id>', 'Task ID returned by `agent run`')
    .option('--cursor <n>', 'Only return messages after this cursor (the `cursor` from the previous poll)')
    .option(...FORMAT_OPTION)
    .action(async (opts: AgentPollOptions) => {
      const body: Record<string, unknown> = { task_id: opts.taskId };
      if (opts.cursor !== undefined) body.cursor = Number(opts.cursor);
      const data = await apolloRequest('/agents/poll_task', body);
      print(data, opts.format);
    });
}
