# apollo-io-cli

A command-line interface for the [Apollo.io API](https://docs.apollo.io/). Search and enrich people and companies, find job postings, surface news, manage CRM contacts/accounts/deals, drive sequences, draft and send outreach emails, manage lists and custom fields, log calls and tasks, search conversations, and pull analytics — all from your terminal, pipeable with `jq` and switchable to CSV / YAML / JSONL / table output.

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

# Company-attribute filters apply to the person's employer — combine them to
# target people by title AND their company's size, hiring activity, etc. in one call:
apollo people search --title CTO --employees "51,200" --hiring-for "Software Engineer"
```

| Option | Description |
|---|---|
| `-q, --query` | Name or keyword query |
| `--title` | Job title(s) |
| `--include-similar-titles` | Also match titles similar to `--title` (fuzzy instead of strict) |
| `--city` | Person location(s) (city, state, country) |
| `--seniority` | Seniority level(s): `manager` `director` `vp` `c_suite` etc. |
| `--department` | Department(s): `engineering` `sales` `marketing` etc. |
| `--email-status` | Contact email status(es): `verified` `unverified` etc. |
| `--technology` | Technology UIDs the person's company uses (any of) |
| `--using-all-technology` | Technology UIDs the company uses (all of) |
| `--not-using-technology` | Technology UIDs the company does NOT use |
| `--domain` | Company domain(s) |
| `--industry` | Industry tag ID(s) — opaque IDs like `5567cd4773696439b10b0000`, not free-text names |
| `--keyword-tags` | Free-text keyword tag(s) for the person's company |
| `--organization-ids` | Apollo organization ID(s) to restrict to |
| `--company-location` | Person's company HQ location(s) |
| `--employees` | Company employee range, e.g. `"11,50"` or `"51,200"` |
| `--hiring-for` | People whose company is currently hiring for job title(s) |
| `--job-locations` | Locations the person's company is hiring in |
| `--num-jobs` | Number of open jobs at the company as `"min,max"` |
| `--job-posted` | Job-posting date range as `"min,max"` (ISO dates) |
| `--revenue` | Company revenue range as `"min,max"` |
| `--funding` | Company latest funding amount as `"min,max"` |
| `--total-funding` | Company total funding raised as `"min,max"` |
| `--per-page` | Results per page (default: 10) |
| `--page` | Page number (default: 1) |

> Note: `--industry` expects Apollo industry tag IDs, not free-text names. Free-text values return HTTP 422.
>
> Tip: the company-attribute filters (`--employees`, `--hiring-for`, `--industry`, `--revenue`, `--funding`, `--total-funding`, `--company-location`) all run against the person's employer, so you no longer need a two-step "search companies → pipe domains into `--domain`" pipeline for those criteria — do it in a single `people search` call.

#### `enrich`

Enrich a single person's profile. Provide at least one identifier.

```bash
apollo people enrich --email jane@acme.com
apollo people enrich --linkedin https://linkedin.com/in/janedoe
apollo people enrich --first-name Jane --last-name Doe --company "Acme"
apollo people enrich --name "Jane Doe" --domain acme.com --reveal-personal-emails
```

| Option | Description |
|---|---|
| `--email` | Email address |
| `--hashed-email` | MD5 or SHA-256 hashed email address |
| `--linkedin` | LinkedIn profile URL |
| `--first-name` | First name (use with `--last-name` and `--company`) |
| `--last-name` | Last name (use with `--first-name` and `--company`) |
| `--name` | Full name (use with `--company`) |
| `--company` | Company name (use with `--name` or `--first-name`/`--last-name`) |
| `--domain` | Company domain (e.g. `acme.com`) |
| `--reveal-personal-emails` | Reveal personal emails (consumes credits) |

#### `bulk-enrich`

Enrich multiple people in a single request — by email, or by full identifier records via a JSON file.

```bash
apollo people bulk-enrich --emails jane@acme.com john@acme.com
apollo people bulk-enrich --file people.json --reveal-personal-emails
```

| Option | Description |
|---|---|
| `--emails` | Email addresses to enrich |
| `--file` | Path to a JSON file with an array of match records (or `{ "details": [...] }`) — each record may include `first_name`, `last_name`, `name`, `email`, `domain`, `organization_name`, `id`, `linkedin_url` |
| `--reveal-personal-emails` | Reveal personal emails (consumes credits) |

#### `email`

Request an email address for a person by their Apollo person ID.

```bash
apollo people email --id abc123def456
```

#### `get`

Get complete person info by Apollo person ID.

```bash
apollo people get --id abc123def456
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
| `--name` | Filter by organization name |
| `--domains` | Company domain(s) to filter by |
| `--organization-ids` | Apollo organization ID(s) to restrict to |
| `--location` | Location(s) to include |
| `--not-location` | Location(s) to exclude |
| `--employees` | Employee range as `"min,max"` (e.g. `"11,50"`) |
| `--industry` | Industry keyword tag(s) |
| `--technology` | Technology UIDs in use |
| `--revenue` | Revenue range as `"min,max"` |
| `--funding` | Latest funding amount as `"min,max"` |
| `--funding-date` | Latest funding date range as `"min,max"` (ISO dates) |
| `--total-funding` | Total funding raised as `"min,max"` |
| `--hiring-for` | Currently hiring for job title(s) |
| `--job-locations` | Locations the company is hiring in |
| `--num-jobs` | Number of open jobs as `"min,max"` |
| `--job-posted` | Job-posting date range as `"min,max"` (ISO dates) |
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

Get complete organization info by Apollo organization ID (GETs `/api/v1/organizations/:id`).

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
apollo contacts show --id <contact-id>
apollo contacts deals --id <contact-id>
apollo contacts bulk-create --file ./contacts.json
apollo contacts bulk-update --ids <id1> <id2> --owner-id <user-id>
apollo contacts update-stages --ids <id1> <id2> --stage-id <stage-id>
apollo contacts update-owners --ids <id1> <id2> --owner-id <user-id>
apollo contacts stages
```

| Subcommand | Notes |
|---|---|
| `search` | `-q/--query`, `--sort-by`, `--sort-asc`, `--page`, `--per-page` |
| `create` | Fields: `--first-name`, `--last-name`, `--email`, `--organization`, `--title`, `--account-id`, `--website-url`, `--address`, `--direct-phone`, `--corporate-phone`, `--mobile-phone`, `--home-phone`, `--other-phone`, `--label`. `--dedupe` enables Apollo dedup. |
| `update` | Same fields as `create`; `--id` required. PATCHes `/api/v1/contacts/:id`. |
| `show` | View one contact; `--id` required. |
| `deals` | List deals (opportunities) associated with a contact; `--id` required. |
| `bulk-create` | `--file <path>` to a JSON array (or `{ "contacts": [...] }`). |
| `bulk-update` | Same values for many: `--ids` + `--owner-id`/`--account-id`. Per-contact values: `--file <path>` to a JSON array of objects with `id` (or `{ "contact_attributes": [...] }`). |
| `update-stages` | Move contacts to a stage: `--ids`, `--stage-id` (from `contacts stages`). |
| `update-owners` | Reassign owner: `--ids`, `--owner-id`. |
| `stages` | List contact stages and their IDs. |

---

### `apollo accounts`

CRM accounts (companies your team has explicitly added).

```bash
apollo accounts create --name "Acme Co" --domain acme.com
apollo accounts update --id <account-id> --phone 555-303-1234
apollo accounts search --query "acme" --per-page 25
apollo accounts show --id <account-id>
apollo accounts bulk-create --file ./accounts.json
apollo accounts bulk-update --ids <id1> <id2> --stage-id <stage-id>
apollo accounts update-owners --ids <id1> <id2> --owner-id <user-id>
apollo accounts stages
```

| Subcommand | Notes |
|---|---|
| `create` | `--name`, `--domain`, `--phone`, `--address` |
| `update` | Same fields; `--id` required. PATCHes `/api/v1/accounts/:id`. |
| `search` | `-q/--query` (matches account names), `--stage-ids`, `--label-ids`, `--sort-by`, `--sort-asc`, paging. |
| `show` | View one account; `--id` required. |
| `bulk-create` | `--file <path>` to a JSON array (or `{ "accounts": [...] }`). |
| `bulk-update` | Same values for many: `--ids` + `--name`/`--owner-id`/`--stage-id`. Per-account values: `--file <path>` to a JSON array of objects with `id` (or `{ "account_attributes": [...] }`). |
| `update-owners` | Reassign owner: `--ids`, `--owner-id`. |
| `stages` | List account stages and their IDs. |

---

### `apollo deals`

Opportunities (deals) in your Apollo CRM.

```bash
apollo deals create --name "Acme - Q2 Renewal" --amount 50000 --currency USD --account-id <id>
apollo deals search --account-id <id> --per-page 25
apollo deals show --id <opportunity-id>
apollo deals update --id <opportunity-id> --stage-id <stage-id> --amount 75000
apollo deals stages
```

| Subcommand | Notes |
|---|---|
| `create` | `--name` required. Optional: `--owner-id`, `--account-id`, `--amount`, `--currency`, `--stage-id`, `--pipeline-id`, `--close-date` (YYYY-MM-DD), `--description`. |
| `search` | `-q/--query`, `--stage-id`, `--pipeline-id`, `--account-id`, `--owner-id`, `--sort-by`, `--sort-asc`, paging. |
| `show` | GETs `/api/v1/opportunities/:id`. |
| `update` | `--id` required. Optional: `--name`, `--owner-id`, `--amount`, `--stage-id`, `--close-date`. PATCHes `/api/v1/opportunities/:id`. |
| `stages` | List deal stages and their IDs. |

---

### `apollo sequences`

Create/update sequences, manage schedules, approve, and enroll/remove contacts. **`add-contacts` sends real emails — confirm before running.**

```bash
apollo sequences search --query "welcome" --per-page 10
apollo sequences schedules
apollo sequences create --name "Q2 Outbound" --steps-file ./steps.json --schedule-id <schedule-id>
apollo sequences update --id <seq-id> --steps-file ./steps.json --active
apollo sequences approve --id <seq-id>
apollo sequences add-contacts --id <seq-id> --from-email-account <email-account-id> --contact-id <contact-id>
apollo sequences remove-contacts --contact-id <id> --sequence-id <seq-id> --mode remove
```

| Subcommand | Notes |
|---|---|
| `search` | `-q/--query` matches sequence names; paging supported. |
| `schedules` | Lists sending schedules; use a returned id as `--schedule-id` on create/update. |
| `create` | Required: `--name`, `--steps-file` (JSON `emailer_steps`). Optional: `--schedule-id`, `--permissions`, `--exact-daytime`, `--active`, `--label`. |
| `update` | Required: `--id`, `--steps-file` (the FULL step set after update). Optional: `--name`, `--schedule-id`, `--permissions`, `--exact-daytime`, `--active`/`--inactive`, `--label`. |
| `approve` | `--id` required. Approves a sequence pending review. |
| `abort` | `--id` required. Deactivates an active sequence (stops sending). |
| `archive` | `--id` required. Archives a sequence. |
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
apollo tasks show --id <task-id>
apollo tasks update --id <task-id> --priority high --due-at 2026-08-01T09:00:00Z
apollo tasks complete --id <task-id> --note "Called and connected"
apollo tasks skip --id <task-id> --note "No longer relevant"
```

| Subcommand | Notes |
|---|---|
| `create` | Required: `--user-id`, `--type`, and one of `--contact-id`/`--account-id`/`--opportunity-id`. Optional: `--creator-id`, `--title`, `--note`, `--priority`, `--status`, `--due-at`. |
| `bulk-create` | `--file <path>` JSON array (or `{ "tasks_attributes": [...] }`). |
| `search` | `-q/--query`, `--user-id`, `--contact-id`, `--account-id`, `--opportunity-id`, `--priority`, `--sort-by`, paging. GETs `/api/v1/tasks/search`. |
| `show` | View one task; `--id` required. |
| `update` | `--id` required. Optional: `--user-id`, `--creator-id`, `--contact-id`, `--type`, `--title`, `--note`, `--priority`, `--status`, `--due-at`. PATCHes `/api/v1/tasks/:id`. |
| `complete` | Mark a task completed; `--id` required, optional `--note`. |
| `skip` | Skip a task; `--id` required, optional `--note`, `--sync-index` (reindex synchronously). |

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

### `apollo emails`

One-off outreach emails (drafts and sends outside sequences). **`send` delivers a real email — confirm before running.**

```bash
apollo emails draft --contact-id <id> --subject "Quick question" --body-html "<p>Hi there…</p>"
apollo emails send --id <emailer-message-id>
apollo emails status --id <emailer-message-id>
apollo emails stats --id <emailer-message-id>
apollo emails search --query "renewal" --stats delivered opened --per-page 25
```

| Subcommand | Notes |
|---|---|
| `draft` | Requires `--contact-id` or `--reply-to <message-id>`. Optional: `--subject`, `--body-html`/`--body-file`, `--template-id`, `--task-id`, `--tracking`, `--attachment-ids`, `--recipients-file` (JSON array of `{ email, contact_id, recipient_type_cd }`). Creates the draft only. |
| `send` | Sends a drafted email immediately; `--id` required. |
| `status` | Check send status; `--id` required. |
| `stats` | Open/click/reply activity for an email; `--id` required. |
| `search` | `-q/--query`, `--user-ids`, `--stats`, `--reply-classes`, `--email-account-id`, `--sequence-ids`, `--not-sequence-ids`, `--date-range-mode`, `--date-from`/`--date-to`, paging. |

---

### `apollo labels`

Lists (labels) of contacts or accounts.

```bash
apollo labels list
apollo labels create --name "Conference 2026 - Maui" --modality contacts
apollo labels update --id <label-id> --name "Conference 2026 - Maui (West)"
apollo labels add --ids <contact-id1> <contact-id2> --names "Conference 2026 - Maui" --modality contacts
apollo labels remove --ids <contact-id1> --names "Conference 2026 - Maui" --modality contacts
```

| Subcommand | Notes |
|---|---|
| `list` | All lists in the team's account. |
| `create` | `--name`, `--modality contacts\|accounts`; `--book-of-business` for account lists. |
| `update` | Rename by `--id`; `--name` required. |
| `add` / `remove` | `--ids`, `--names`, `--modality` required. Unknown list names are created on `add`. `--async` returns a progress job for large batches. |

---

### `apollo fields`

```bash
apollo fields list
apollo fields create --label "Renewal Date" --modality contact --type date
apollo fields custom
```

| Subcommand | Notes |
|---|---|
| `list` | All fields; optional `--source`. |
| `create` | `--label`, `--modality contact\|account\|opportunity`, `--type string\|textarea\|number\|date\|datetime\|boolean`; optional `--max-length`. |
| `custom` | All custom (typed) fields — returns the field IDs used in `typed_custom_fields` payloads. |

---

### `apollo notes`

```bash
apollo notes list --contact-id <id>
apollo notes list --account-id <id> --limit 50 --sort-direction desc
```

Filters: `--contact-id`, `--account-id`, `--opportunity-id`, `--calendar-event-id`, `--conversation-id`, `--conversation-ids`, `--contact-ids`, `--start-date`, `--sort-by`, `--sort-direction`, `--skip`, `--limit`.

---

### `apollo conversations`

Recorded calls and meetings (Conversation Intelligence).

```bash
apollo conversations search --type phone_call --date-from 2026-01-01T00:00:00Z --limit 25
apollo conversations show --id <conversation-id>
apollo conversations export --start 2026-01-01T00:00:00Z --end 2026-03-31T23:59:59Z --email you@team.com
apollo conversations export-status --id <export-id>
```

| Subcommand | Notes |
|---|---|
| `search` | `--type video_conference\|phone_call`, `--account-id`, `--contact-ids`, `--tag-ids`, `--tracker-ids`, `--organization-ids`, `--date-from`/`--date-to` (ISO, GMT), `--sort-by`, `--limit`, `--page`. |
| `show` | Conversation details; `--id` required. |
| `export` | Starts an export; `--start`, `--end`, `--email` required. |
| `export-status` | Poll an export job; `--id` required. |

---

### `apollo webhooks`

```bash
apollo webhooks result --request-id <id>
```

Polls the stored result of an asynchronous (webhook-based) request, e.g. async bulk enrichment.

---

### `apollo usage`

```bash
apollo usage credits
apollo usage api
```

| Subcommand | Notes |
|---|---|
| `credits` | Returns `credit_usage_stats` for the authenticated team (lead / direct-dial / export / conversation / AI / power-up credits with limit/consumed/left_over). |
| `api` | Returns per-endpoint API usage stats and rate limits. |

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

## Global flags

These flags are accepted by every command and must be placed before the subcommand:

| Flag | Description |
|---|---|
| `--add-header <key:value>` | Inject a custom HTTP header into the request. Repeatable. Header names are normalized to lowercase. |

```bash
apollo --add-header x-request-id:abc123 people search --q-keywords "Jane"
apollo --add-header x-foo:bar --add-header x-baz:qux contacts search --q-keywords "Smith"
```

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
