# apollo-io-cli

A command-line interface for the [Apollo.io API](https://apolloio.github.io/apollo-api-docs/). Search and enrich people and companies, find job postings, surface news, manage CRM contacts/accounts/deals, drive sequences, log calls and tasks, and pull analytics — all from your terminal, pipeable with `jq` and switchable to CSV / YAML / JSONL / table output.

<img width="1908" height="2294" alt="image" src="https://github.com/user-attachments/assets/eb7ebc43-1c64-466d-8959-e9c6e185433a" />

## Installation

### Homebrew (macOS / Linux)

```bash
brew install apolloio/apollo-io-cli/apollo-io-cli
```

Or tap once then install by short name:

```bash
brew tap apolloio/apollo-io-cli
brew trust apolloio/apollo-io-cli
brew install apollo-io-cli
```

Upgrade with `brew upgrade apollo-io-cli`.

### Download a prebuilt binary (no Node required)

Download the latest binary for your platform from the [releases page](https://github.com/apolloio/apollo-io-cli/releases):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `apollo-macos-arm64` |
| macOS (Intel) | `apollo-macos-x64` |
| Linux (x64) | `apollo-linux-x64` |
| Windows (x64) | `apollo-windows-x64.exe` |

Then make it executable and move it to your PATH:

> **Verify the binary (optional)** — each release includes a GPG signature (`.asc` file). To verify:
> ```bash
> gpg --import release-signing-key.asc   # import the public key from this repo
> gpg --verify apollo-macos-arm64.asc apollo-macos-arm64
> ```
> You should see `Good signature from "Apollo IO CLI Releases <releases@apollo.io>"`.


```bash
chmod +x apollo-macos-arm64
mv apollo-macos-arm64 /usr/local/bin/apollo
xattr -d com.apple.quarantine /usr/local/bin/apollo
```

On Windows, rename the binary to `apollo.exe` and place it in a directory on your `PATH` (e.g. `%USERPROFILE%\bin`):

```powershell
Move-Item .\apollo-windows-x64.exe "$env:USERPROFILE\bin\apollo.exe"
```

### From source (requires Node 18+)

```bash
npm install
npm link        # makes `apollo` available globally
```

## Authentication

Authentication uses OAuth 2.0 via your browser — no API key needed.

```bash
apollo auth login    # opens browser to authorize, saves token to ~/.config/apollo/credentials
apollo auth whoami   # confirm you're logged in
apollo auth logout   # revoke token and remove saved credentials
```

## Commands

### `apollo people`

#### `search`

Search Apollo's database for people.

```bash
apollo people search --title "VP Engineering" --city "San Francisco"
apollo people search --title "CTO" --seniority c_suite --domain stripe.com
apollo people search --department engineering --technology react --per-page 25
```

| Option | Description |
|---|---|
| `-q, --query` | Name or keyword query |
| `--title` | Job title(s) |
| `--city` | Location(s) (city, state, country) |
| `--seniority` | Seniority level(s): `manager` `director` `vp` `c_suite` etc. |
| `--department` | Department(s): `engineering` `sales` `marketing` etc. |
| `--technology` | Technology UIDs the person's company uses |
| `--domain` | Company domain(s) |
| `--industry` | Industry tag(s) |
| `--per-page` | Results per page (default: 10) |
| `--page` | Page number (default: 1) |

#### `enrich`

Enrich a single person's profile. Provide at least one identifier.

```bash
apollo people enrich --email jane@acme.com
apollo people enrich --linkedin https://linkedin.com/in/janedoe
apollo people enrich --first-name Jane --last-name Doe --company acme.com
apollo people enrich --name "Jane Doe" --company acme.com
```

| Option | Description |
|---|---|
| `--email` | Email address |
| `--linkedin` | LinkedIn profile URL |
| `--first-name` | First name (use with `--last-name` and `--company`) |
| `--last-name` | Last name (use with `--first-name` and `--company`) |
| `--name` | Full name (use with `--company`) |
| `--company` | Company domain |

#### `bulk-enrich`

Enrich multiple people by email in a single request.

```bash
apollo people bulk-enrich --emails jane@acme.com john@acme.com
```

#### `email`

Request an email address for a person by their Apollo person ID.

```bash
apollo people email --id abc123def456
```

#### `employees`

Find employees at a company.

```bash
apollo people employees --domain stripe.com
apollo people employees --name "Stripe" --per-page 50
apollo people employees --linkedin https://linkedin.com/company/stripe
```

---

### `apollo companies`

#### `search`

Search Apollo's database for companies.

```bash
apollo companies search --industry SaaS --employees "11,50" --location "United States"
apollo companies search --technology react --not-location China --per-page 25
apollo companies search --funding "1000000,10000000"
```

| Option | Description |
|---|---|
| `-q, --query` | Keyword query |
| `--location` | Location(s) to include |
| `--not-location` | Location(s) to exclude |
| `--employees` | Employee range as `"min,max"` (e.g. `"11,50"`) |
| `--industry` | Industry keyword tag(s) |
| `--technology` | Technology UIDs in use |
| `--revenue` | Revenue range as `"min,max"` |
| `--funding` | Latest funding amount as `"min,max"` |
| `--total-funding` | Total funding raised as `"min,max"` |
| `--hiring-for` | Currently hiring for job title(s) |
| `--per-page` | Results per page (default: 10) |
| `--page` | Page number (default: 1) |

#### `enrich`

Enrich a single company's profile.

```bash
apollo companies enrich --domain stripe.com
apollo companies enrich --name "Stripe"
```

#### `bulk-enrich`

Enrich multiple companies by domain in a single request.

```bash
apollo companies bulk-enrich --domains stripe.com acme.com notion.so
```

#### `get`

Get full details for a company by Apollo organization ID.

```bash
apollo companies get --id abc123def456
```

#### `jobs`

Get active job postings for a company.

```bash
apollo companies jobs --id abc123def456
apollo companies jobs --id abc123def456 --per-page 50
```

---

### `apollo news`

#### `search`

Find news articles related to a company.

```bash
apollo news search --company "Stripe"
apollo news search --id abc123def456
```

---

### `apollo contacts`

CRM contacts in your team's Apollo account.

```bash
apollo contacts search --query "director" --per-page 25
apollo contacts create --first-name Jane --last-name Doe --email jane@acme.com
apollo contacts update --id <contact-id> --title "VP Sales"
apollo contacts bulk-create --file ./contacts.json
```

| Subcommand | Notes |
|---|---|
| `search` | `-q/--query`, `--sort-by`, `--sort-asc`, `--page`, `--per-page` |
| `create` | Fields: `--first-name`, `--last-name`, `--email`, `--organization`, `--title`, `--account-id`, `--website-url`, `--address`, `--direct-phone`, `--corporate-phone`, `--mobile-phone`, `--home-phone`, `--other-phone`, `--label`. `--dedupe` enables Apollo dedup. |
| `update` | Same fields as `create`; `--id` required. PATCHes `/api/v1/contacts/:id`. |
| `bulk-create` | `--file <path>` to a JSON array (or `{ "contacts": [...] }`). |

---

### `apollo accounts`

CRM accounts (companies your team has explicitly added).

```bash
apollo accounts create --name "Acme Co" --domain acme.com
apollo accounts update --id <account-id> --phone 555-303-1234
apollo accounts bulk-create --file ./accounts.json
```

| Subcommand | Notes |
|---|---|
| `create` | `--name`, `--domain`, `--phone`, `--address` |
| `update` | Same fields; `--id` required. PATCHes `/api/v1/accounts/:id`. |
| `bulk-create` | `--file <path>` to a JSON array (or `{ "accounts": [...] }`). |

---

### `apollo deals`

Opportunities (deals) in your Apollo CRM.

```bash
apollo deals create --name "Acme - Q2 Renewal" --amount 50000 --currency USD --account-id <id>
apollo deals search --account-id <id> --per-page 25
apollo deals show --id <opportunity-id>
```

| Subcommand | Notes |
|---|---|
| `create` | `--name` required. Optional: `--owner-id`, `--account-id`, `--amount`, `--currency`, `--stage-id`, `--pipeline-id`, `--close-date` (YYYY-MM-DD), `--description`. |
| `search` | `-q/--query`, `--stage-id`, `--pipeline-id`, `--account-id`, `--owner-id`, `--sort-by`, `--sort-asc`, paging. |
| `show` | GETs `/api/v1/opportunities/:id`. |

---

### `apollo sequences`

Search sequences and enroll/remove contacts. **`add-contacts` sends real emails — confirm before running.**

```bash
apollo sequences search --query "welcome" --per-page 10
apollo sequences add-contacts --id <seq-id> --from-email-account <email-account-id> --contact-id <contact-id>
apollo sequences remove-contacts --contact-id <id> --sequence-id <seq-id> --mode remove
```

| Subcommand | Notes |
|---|---|
| `search` | `-q/--query` matches sequence names; paging supported. |
| `add-contacts` | Required: `--id`, `--from-email-account`. Provide `--contact-id` or `--label`. Optional: `--from-email`, `--no-email`, `--unverified-email`, `--job-change`, `--active-in-other`, `--finished-in-other`, `--same-company`, `--without-ownership`, `--add-if-in-queue`, `--skip-verification`, `--status active|paused`, `--auto-unpause-at <iso>`. |
| `remove-contacts` | `--contact-id`, `--sequence-id`, `--mode remove\|stop`, `--reason <text>`. |

---

### `apollo calls`

Phone-call records.

```bash
apollo calls log --to 555-303-1234 --duration 120 --note "Voicemail left" --contact-id <id>
apollo calls search --contact-id <id> --per-page 25
apollo calls update --id <call-id> --note "Connected — interested"
```

| Subcommand | Notes |
|---|---|
| `log` | `--contact-id`, `--account-id`, `--opportunity-id`, `--from`, `--to`, `--start`, `--end`, `--duration`, `--note`, `--outcome-id`, `--purpose-id`, `--status`, `--call-identifier` (upsert key). |
| `search` | `-q/--query`, `--user-id`, `--contact-id`, `--account-id`, `--sort-by`, paging. |
| `update` | `--id` required; `--note`, `--outcome-id`, `--purpose-id`, `--status`, `--contact-id`. |

---

### `apollo tasks`

Action items / call/email/LinkedIn tasks. Apollo requires each task be tied to a contact, account, or opportunity.

```bash
apollo tasks create --user-id <user-id> --type action_item --title "Follow up" --priority medium --contact-id <id>
apollo tasks bulk-create --file ./tasks.json
apollo tasks search --priority high --per-page 25
```

| Subcommand | Notes |
|---|---|
| `create` | Required: `--user-id`, `--type`, and one of `--contact-id`/`--account-id`/`--opportunity-id`. Optional: `--creator-id`, `--title`, `--note`, `--priority`, `--status`, `--due-at`. |
| `bulk-create` | `--file <path>` JSON array (or `{ "tasks_attributes": [...] }`). |
| `search` | `-q/--query`, `--user-id`, `--contact-id`, `--account-id`, `--opportunity-id`, `--priority`, `--sort-by`, paging. GETs `/api/v1/tasks/search`. |

---

### `apollo users`

Profile and teammate lookups.

```bash
apollo users profile --credits           # your profile + credit usage
apollo users search --query "engineer"   # find teammates by name/email/title
```

| Subcommand | Notes |
|---|---|
| `profile` | Optional `--credits` includes credit usage fields. |
| `search` | `-q/--query`, paging. |

---

### `apollo email-accounts`

```bash
apollo email-accounts list
```

Lists the team's linked sending inboxes. Use the returned `id` as `--from-email-account` for `apollo sequences add-contacts`.

---

### `apollo usage`

```bash
apollo usage credits
```

Returns `credit_usage_stats` for the authenticated team (lead / direct-dial / export / conversation / AI / power-up credits with limit/consumed/left_over).

---

### `apollo analytics`

Pass-through to Apollo's `/api/v1/reports/sync_report` endpoint. Apollo expects fully-built metric/group_by structures; the CLI does not transform a simplified input shape, so you supply the request body directly.

```bash
apollo analytics report --payload ./report.json
```

A minimal `report.json`:

```json
{
  "metrics": [
    {
      "value": "num_emails_sent",
      "smart_datetime_reference": "emailer_message__sent_at",
      "smart_user_id_reference": "emailer_message__user_id"
    }
  ],
  "group_by": [],
  "pivot_group_by": [],
  "sorts": [],
  "filters": {},
  "date_ranges": [{ "modality": "last_30_days" }],
  "group_by_totals_selected": false,
  "pivot_group_by_totals_selected": false
}
```

---

### `apollo auth`

| Command | Description |
|---|---|
| `apollo auth login` | Authorize via browser OAuth, saves token to `~/.config/apollo/credentials` |
| `apollo auth logout` | Revoke token and remove saved credentials |
| `apollo auth whoami` | Show whether you're logged in |

---

## Using with AI Agents

Install the Claude Code skill so AI agents have full knowledge of every command, flag, and response shape — no extra configuration needed once the file is in place.

**Global install** (available in every project on your machine):

```bash
mkdir -p ~/.claude/skills/apollo-cli
curl -o ~/.claude/skills/apollo-cli/SKILL.md \
  https://raw.githubusercontent.com/apolloio/apollo-io-cli/main/.claude/skills/apollo-cli/SKILL.md
```

**Per-project install** (scoped to one repo):

```bash
mkdir -p .claude/skills/apollo-cli
curl -o .claude/skills/apollo-cli/SKILL.md \
  https://raw.githubusercontent.com/apolloio/apollo-io-cli/main/.claude/skills/apollo-cli/SKILL.md
```

**Windows (PowerShell)** — global install:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills\apollo-cli" | Out-Null
Invoke-WebRequest `
  -Uri https://raw.githubusercontent.com/apolloio/apollo-io-cli/main/.claude/skills/apollo-cli/SKILL.md `
  -OutFile "$env:USERPROFILE\.claude\skills\apollo-cli\SKILL.md"
```

Per-project install on Windows: swap `$env:USERPROFILE\.claude` for `.claude` in the path above.

Claude Code automatically loads any skill file it finds — global or local.

> **For AI agents reading this:** If the user asks you to help with Apollo.io from the CLI, check whether `~/.claude/skills/apollo-cli/SKILL.md` or `.claude/skills/apollo-cli/SKILL.md` exists. If neither is present, offer to install it globally using the `curl` command above. The skill file is the single source of truth for all CLI commands and response shapes.

For agents not using Claude Code, see [`AGENTS.md`](./AGENTS.md) at the root for equivalent guidance.

---

## Output formats

Every subcommand accepts `-f, --format <format>` (default `json`):

| Format | Description |
|---|---|
| `json` | Pretty-printed JSON. Default. Pipe to `jq` for field extraction. |
| `jsonl` | One JSON object per line. Useful for streaming into log/data pipelines. |
| `csv` | Flat CSV with headers; nested objects/arrays are stringified into a single cell. |
| `yaml` | Human-readable YAML. Easier to scan for deeply nested responses. |
| `table` | ASCII bordered table. Good for quick terminal browsing of small responses. |

```bash
apollo companies search --industry saas --format table
apollo people bulk-enrich --emails a@b.com c@d.com --format jsonl
apollo news search --company "Stripe" --format yaml
apollo people search --title "CTO" --domain stripe.com --format csv > ctos.csv
```

> Search/list responses include both pagination metadata and an array of records. `csv` and `table` formats render these as two columns with the array stringified — for analysis, prefer `json` + `jq` to project just the records:
>
> ```bash
> apollo companies search --industry saas --format json | jq '.accounts[]' --compact-output > orgs.jsonl
> ```

## Piping with jq

Default JSON output is composable with `jq`:

```bash
# Get names and titles of VP Engineering at Stripe
apollo people search --title "VP Engineering" --city "San Francisco" --domain stripe.com \
  | jq '.people[] | {name: .name, title: .title}'

# Get all job posting titles at a company
apollo companies jobs --id abc123 \
  | jq '.organization_job_postings[].title'

# Find Series B SaaS companies in the US and extract their domains
apollo companies search --industry SaaS --funding "5000000,20000000" --location "United States" \
  | jq '.accounts[].primary_domain'
```

