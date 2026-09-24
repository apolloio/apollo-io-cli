# Contributing

A short guide to adding a new command to the Apollo CLI and testing it.

## Setup

Requires Node 18+. [Bun](https://bun.sh) is optional but is what the build and the live suite use.

```bash
npm install
npm start -- people search --title CTO   # run from source
npm link                                 # or make `apollo` global
apollo auth login                        # needed for anything that hits the API
```

## Layout

| Path | What lives there |
|---|---|
| `src/commands/*.ts` | One file per top-level command, each exporting `register<Name>(program)` |
| `src/index.ts` | Builds the root `program` and calls every `register*()` |
| `src/api.ts` | `apolloGet` / `apolloRequest` — auth, base URL, error handling |
| `src/output.ts` | `print()` and the shared `FORMAT_OPTION` |
| `src/utils.ts` | Shared option parsers (`parsePageOptions`, `parseRange`, …) |
| `src/live/` | Opt-in tests against the real API (never run in CI) |

## Adding a command

### 1. Create `src/commands/<name>.ts`

Export a single `register<Name>(program)` that defines a command group and its subcommands:

```ts
import type { Command } from 'commander';
import { apolloGet, apolloRequest, type QueryParams } from '../api.js';
import { print, FORMAT_OPTION } from '../output.js';
import { parsePageOptions } from '../utils.js';

interface WidgetsCreateOptions {
  name: string;
  ownerId?: string;
  quantity?: string;
  format?: string;
}

// Pure option -> request-body mapping, exported so it can be unit tested.
export function buildWidgetsCreateBody(opts: WidgetsCreateOptions): Record<string, unknown> {
  const body: Record<string, unknown> = { name: opts.name };
  if (opts.ownerId) body.owner_id = opts.ownerId;
  if (opts.quantity !== undefined) body.quantity = Number(opts.quantity);
  return body;
}

export function registerWidgets(program: Command): void {
  const widgets = program.command('widgets').description('List and create widgets');

  widgets
    .command('list')
    .description('List widgets')
    .option('--owner-id <id>', 'Filter by owner')
    .option('--per-page <n>', 'Results per page', '10')
    .option('--page <n>', 'Page number', '1')
    .option(...FORMAT_OPTION)
    .action(async (opts: { ownerId?: string; page?: string; perPage?: string; format?: string }) => {
      const params: QueryParams = { ...parsePageOptions(opts) };
      if (opts.ownerId) params.owner_id = opts.ownerId;
      const data = await apolloGet('/widgets', params);
      print(data, opts.format);
    });

  widgets
    .command('create')
    .description('Create a widget')
    .requiredOption('--name <name>', 'Widget name')
    .option('--owner-id <id>', 'Apollo user ID of the owner')
    .option('--quantity <n>', 'How many')
    .option(...FORMAT_OPTION)
    .action(async (opts: WidgetsCreateOptions) => {
      const data = await apolloRequest('/widgets', buildWidgetsCreateBody(opts));
      print(data, opts.format);
    });
}
```

Conventions worth knowing:

- **Flags are kebab-case, options are camelCase.** Commander turns `--owner-id` into `opts.ownerId`, and `--ids <ids...>` into a `string[]`.
- **Every option value is a string.** Coerce with `Number()` when the API wants a number.
- **Pull body/param mapping into an exported `build*Body()` function** once a command has more than a couple of fields. That function is what the unit suite tests.
- **Use `apolloGet(path, params)` for GET** and `apolloRequest(path, body, method, params)` for `POST` (default), `PATCH`, `PUT`, or `DELETE`. Both attach auth and exit non-zero with `Apollo API error <status>: <body>` on failure, so actions don't need their own error handling.
- **Always end with `print(data, opts.format)`** and include `.option(...FORMAT_OPTION)` so `--format json|jsonl|csv|yaml|table` works everywhere.
- **Report user errors as `console.error(...)` + `process.exit(1)`**, matching `parsePageOptions` — don't throw.

### 2. Register it in `src/index.ts`

Add the import, then slot the call into the alphabetical `register*()` block:

```ts
import { registerWidgets } from './commands/widgets.js';
// ...
registerWidgets(program);
```

The `.js` extension in imports is required — this is an ESM project compiled by `tsc`.

### 3. Document it

- Add an `apollo widgets` subsection (a `###` heading) under `## Commands` in `README.md`, with a runnable example per subcommand.
- Add matching usage to `.claude/skills/apollo-cli/SKILL.md`, which agents fetch directly (see `AGENTS.md`).

## Testing

### Unit tests

Put them next to the command in `src/commands/<name>.test.ts`. The unit suite never touches the network, so it tests the exported pure builders rather than the Commander actions. No PR check runs it today — the automated checks are org-wide security scans — so run it yourself before pushing.

```ts
import { describe, it, expect } from 'vitest';
import { buildWidgetsCreateBody } from './widgets.js';

describe('buildWidgetsCreateBody', () => {
  it('omits unset fields', () => {
    expect(buildWidgetsCreateBody({ name: 'Sprocket' })).toEqual({ name: 'Sprocket' });
  });

  it('maps options to API keys and coerces numbers', () => {
    expect(buildWidgetsCreateBody({ name: 'Sprocket', ownerId: 'user_1', quantity: '12' })).toEqual({
      name: 'Sprocket',
      owner_id: 'user_1',
      quantity: 12,
    });
  });
});
```

Aim these at the things that actually break: a CLI flag mapped to the wrong API key, a number left as a string, a filter silently dropped when unset.

```bash
npm test            # unit suite
npm run test:watch
npm run typecheck   # tsc --noEmit
```

### Smoke test it by hand

```bash
npm start -- widgets list --per-page 3 --format table
npm start -- widgets create --name Sprocket --quantity 12
npm start -- help widgets          # check the help text reads well
```

Point the CLI at another host with `APOLLO_API_BASE_URL`, and add request headers with the global `--add-header key:value`.

### Live tests (optional)

`src/live/` runs the real CLI against `https://api.apollo.io` and catches what the unit suite can't — mainly parameters the API silently ignores or rejects with a 422. It's local-only and skips unless you're logged in.

```bash
npm run test:live
```

Writes are opt-in and gated behind a dedicated throwaway team. Read [`src/live/README.md`](src/live/README.md) before enabling them. Adding a read-only case to `src/live/read-only.live.test.ts` for a new search or list command is cheap and worth it.

## Opening a PR

- Branch off `main`.
- Prefix the title with the ticket, or `NOTICKET` when there isn't one — e.g. `[HDLS-305] Add widgets command` or `NOTICKET Add widgets command`.
- Before pushing: `npm run typecheck && npm test`.
- Bump the `version` in `package.json` for user-visible changes. Releases are cut by pushing a `v*` tag, which builds, signs, and publishes the binaries and opens a Homebrew formula bump.
