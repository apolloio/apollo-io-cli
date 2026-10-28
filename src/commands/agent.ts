import type { Command } from 'commander';
import { apolloRequest } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';

interface AgentRunOptions {
  instruction: string;
  taskId?: string;
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
    .description('Run and poll Apollo AI Assistant tasks (natural-language prospecting, research, analysis, and more)');

  agent
    .command('run')
    .description('Start an Assistant task, or continue one with --task-id (returns immediately; poll with `agent poll`)')
    .requiredOption('--instruction <text>', 'What the Assistant should do, in plain language')
    .option('--task-id <id>', 'Continue this task (answer its question or send a follow-up) instead of starting a new one')
    .option(...FORMAT_OPTION)
    .action(async (opts: AgentRunOptions) => {
      const body: Record<string, unknown> = { instruction: opts.instruction };
      if (opts.taskId) body.task_id = opts.taskId;
      const data = await apolloRequest('/agents/task', body);
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
