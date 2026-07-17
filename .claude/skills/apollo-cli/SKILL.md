---
name: apollo-cli
description: This skill should be used when searching for people, companies, employees, job postings, or news, OR when driving CRM data (contacts, accounts, deals), sequences, one-off outreach emails, lists/labels, custom fields, notes, phone calls, tasks, conversations, analytics, or credit/API usage in Apollo.io from the terminal. Activates when the user asks to "find people", "search companies", "enrich a contact", "look up employees", "find jobs at a company", "get company news", "create a contact / account / deal", "log a call", "create a task", "add to sequence", "send an email", "add to a list", "check analytics", "view credit usage", or any task involving Apollo.io data lookup or CRM writes from the terminal.
version: 4.0.0
---

# Apollo CLI Skill

Use the `apollo` CLI to drive Apollo.io end to end: search/enrich people and companies, surface news and job postings, manage CRM contacts/accounts/deals, drive sequences, draft and send outreach emails, manage lists (labels) and custom fields, view notes, log phone calls and tasks, search recorded conversations, pull analytics, and inspect credit/API usage. Output defaults to JSON for `jq` piping; use `-f, --format` to switch to `jsonl`, `csv`, `yaml`, or `table`.

## Authentication

Before running any command, confirm the user is authenticated:

```bash
apollo auth whoami
```

If not logged in, run:

```bash
apollo auth login
```

## Commands

### People

**Search people by title, company, location, seniority, department, or technology:**

```bash
apollo people search --title "VP Engineering" --domain stripe.com
apollo people search --title "CTO" --seniority c_suite --city "San Francisco"
apollo people search --department engineering --technology react --per-page 25
```

**Filter people by their company's attributes in a single call** — `--employees`, `--hiring-for`, `--industry`, `--revenue`, `--funding`, `--total-funding`, and `--company-location` all apply to the person's employer. Prefer this over a two-step "search companies → pipe domains into `--domain`" pipeline:

```bash
# CTOs at 51–200 person companies that are currently hiring software engineers
apollo people search --title CTO --employees "51,200" --hiring-for "Software Engineer"
```

**More search filters:** `--include-similar-titles` (fuzzy title match), `--email-status verified`, `--keyword-tags` (free-text company keywords), `--organization-ids`, `--using-all-technology` / `--not-using-technology` (vs the any-of `--technology`), and company hiring filters `--job-locations`, `--num-jobs "min,max"`, `--job-posted "min,max"`.

> Note: `people search --industry` expects Apollo industry **tag IDs** (e.g. `5567cd4773696439b10b0000`), not free-text names like `"artificial intelligence"`. Passing free text returns HTTP 422. Use `--keyword-tags` or `companies search --industry` for free-text keyword tags.

**Enrich a person (provide at least one identifier):**

```bash
apollo people enrich --email jane@acme.com
apollo people enrich --linkedin https://linkedin.com/in/janedoe
apollo people enrich --first-name Jane --last-name Doe --company "Acme"
apollo people enrich --name "Jane Doe" --domain acme.com --reveal-personal-emails
```

Identifiers: `--email`, `--hashed-email`, `--linkedin`, `--name`/`--first-name`+`--last-name`, plus `--company` (name) and/or `--domain`. Add `--reveal-personal-emails` to surface personal emails (consumes credits).

**Bulk enrich multiple people** — by email, or by full identifier records via a JSON file:

```bash
apollo people bulk-enrich --emails jane@acme.com john@acme.com
# people.json: [{ "name": "Jane Doe", "domain": "acme.com" }, { "email": "x@y.com" }]
apollo people bulk-enrich --file people.json --reveal-personal-emails
```

**Request an email address by Apollo person ID:**

```bash
apollo people email --id <apollo_person_id>
```

**Get complete person info by Apollo person ID:**

```bash
apollo people get --id <apollo_person_id>
```

**Find employees at a company:**

```bash
apollo people employees --domain stripe.com
apollo people employees --name "Stripe" --per-page 50
apollo people employees --linkedin https://linkedin.com/company/stripe
```

---

### Companies

**Search companies by industry, size, location, funding, or technology:**

```bash
apollo companies search --industry SaaS --employees "11,50" --location "United States"
apollo companies search --technology react --not-location China --per-page 25
apollo companies search --funding "1000000,10000000"
```

Also: `--name`, `--domains`, `--organization-ids`, `--funding-date "min,max"` (ISO dates), and hiring filters `--job-locations`, `--num-jobs "min,max"`, `--job-posted "min,max"`.

**Enrich a company by domain or name:**

```bash
apollo companies enrich --domain stripe.com
apollo companies enrich --name "Stripe"
```

**Bulk enrich multiple companies by domain:**

```bash
apollo companies bulk-enrich --domains stripe.com acme.com notion.so
```

**Get complete organization info by Apollo organization ID:**

```bash
apollo companies get --id <organization_id>
```

**Get active job postings for a company:**

```bash
apollo companies jobs --id <organization_id>
apollo companies jobs --id <organization_id> --per-page 50
```

---

### News

**Find news articles for a company:**

```bash
apollo news search --company "Stripe"
apollo news search --id <organization_id>
```

---

### Contacts (CRM)

**Search contacts your team has saved in Apollo:**

```bash
apollo contacts search --query "director" --per-page 25
```

**Create a contact:**

```bash
apollo contacts create --first-name Jane --last-name Doe --email jane@acme.com --title "VP Sales" --dedupe
```

**Update a contact (PATCH /api/v1/contacts/:id):**

```bash
apollo contacts update --id <contact_id> --title "VP Engineering"
```

**View a contact, or its associated deals:**

```bash
apollo contacts show --id <contact_id>
apollo contacts deals --id <contact_id>
```

**Bulk-create from a JSON file (array, or `{ "contacts": [...] }`):**

```bash
apollo contacts bulk-create --file ./contacts.json
```

**Bulk operations across many contacts:**

```bash
apollo contacts bulk-update --ids <id1> <id2> --owner-id <user_id>       # same values for all
apollo contacts bulk-update --file ./updates.json                        # per-contact values (objects need "id")
apollo contacts update-stages --ids <id1> <id2> --stage-id <stage_id>    # stage IDs from `contacts stages`
apollo contacts update-owners --ids <id1> <id2> --owner-id <user_id>
apollo contacts stages                                                   # list contact stages -> stage IDs
```

---

### Accounts (CRM companies)

```bash
apollo accounts create --name "Acme Co" --domain acme.com
apollo accounts update --id <account_id> --phone 555-303-1234
apollo accounts search --query "acme" --per-page 25      # matches account names; --stage-ids/--label-ids filters
apollo accounts show --id <account_id>
apollo accounts bulk-create --file ./accounts.json
apollo accounts bulk-update --ids <id1> <id2> --stage-id <stage_id>   # or --file for per-account values
apollo accounts update-owners --ids <id1> <id2> --owner-id <user_id>
apollo accounts stages                                   # list account stages -> stage IDs
```

---

### Deals (opportunities)

```bash
apollo deals create --name "Acme - Q2 Renewal" --amount 50000 --currency USD --account-id <id> --close-date 2026-06-30
apollo deals search --account-id <id> --per-page 25
apollo deals show --id <opportunity_id>
apollo deals update --id <opportunity_id> --stage-id <stage_id> --amount 75000
apollo deals stages                                      # list deal stages -> stage IDs
```

---

### Sequences

`add-contacts` **sends real emails**. Always (1) call `sequences search` first to confirm the right sequence ID, (2) call `email-accounts list` to pick a sender ID, (3) summarize sender + sequence + contact count + status to the user, and (4) only call after explicit confirmation.

```bash
apollo sequences search --query "welcome"
apollo sequences add-contacts --id <seq_id> --from-email-account <email_account_id> --contact-id <contact_id>
apollo sequences add-contacts --id <seq_id> --from-email-account <id> --label "Q2 Targets" --status paused --auto-unpause-at 2026-05-15T09:00:00Z
apollo sequences remove-contacts --contact-id <id> --sequence-id <seq_id> --mode remove
```

**Build and manage sequences:**

```bash
apollo sequences schedules                       # list send schedules -> emailer_schedule_id
apollo sequences create --name "Q2 Outbound" --steps-file ./steps.json --schedule-id <id>
apollo sequences update --id <seq_id> --steps-file ./steps.json --active   # --steps-file is the FULL step set
apollo sequences approve --id <seq_id>           # approve a sequence pending review
apollo sequences abort --id <seq_id>             # deactivate an active sequence (stops sending)
apollo sequences archive --id <seq_id>           # archive a sequence
```

`create`/`update` take the ordered `emailer_steps` as a JSON file (`--steps-file`); `create` requires `--name`, `update` requires `--id`. Activation: `create --active`, or `update --active`/`--inactive`. Get `--schedule-id` from `sequences schedules`. Activating + approving means contacts can start receiving real email — confirm with the user first.

---

### Emails (one-off outreach)

`emails send` **delivers a real email**. Always show the draft (contact, subject, body) to the user and get explicit confirmation before sending.

```bash
apollo emails draft --contact-id <id> --subject "Quick question" --body-html "<p>Hi…</p>"   # draft only, no send
apollo emails draft --reply-to <emailer_message_id> --body-file ./reply.html                # reply to an existing message
apollo emails send --id <emailer_message_id>       # SEND the drafted email now
apollo emails status --id <emailer_message_id>     # check send status
apollo emails stats --id <emailer_message_id>      # opens / clicks / replies
apollo emails search -q "renewal" --stats delivered opened --per-page 25
```

Draft options: `--template-id`, `--task-id`, `--tracking`, `--attachment-ids`, `--recipients-file` (JSON array of `{ email, contact_id, recipient_type_cd }` for to/cc/bcc).

---

### Lists (labels)

```bash
apollo labels list                                                        # all lists -> label IDs and names
apollo labels create --name "Conference 2026" --modality contacts         # or accounts; --book-of-business for account lists
apollo labels update --id <label_id> --name "Conference 2026 (West)"
apollo labels add --ids <id1> <id2> --names "Conference 2026" --modality contacts     # creates missing lists
apollo labels remove --ids <id1> --names "Conference 2026" --modality contacts
```

`add`/`remove` accept `--async` for large batches (returns an `entity_progress_job` to poll instead of the updated lists).

---

### Fields (including custom fields)

```bash
apollo fields list                       # all fields; optional --source
apollo fields custom                     # custom (typed) fields -> IDs for typed_custom_fields payloads
apollo fields create --label "Renewal Date" --modality contact --type date   # modality: contact|account|opportunity
```

---

### Notes

```bash
apollo notes list --contact-id <id>
apollo notes list --account-id <id> --limit 50 --sort-direction desc
```

Filters: `--contact-id`, `--account-id`, `--opportunity-id`, `--calendar-event-id`, `--conversation-id(s)`, `--contact-ids`, `--start-date`, `--sort-by`, `--sort-direction`, `--skip`, `--limit`.

---

### Conversations (recorded calls/meetings)

```bash
apollo conversations search --type phone_call --date-from 2026-01-01T00:00:00Z --limit 25
apollo conversations show --id <conversation_id>
apollo conversations export --start 2026-01-01T00:00:00Z --end 2026-03-31T23:59:59Z --email you@team.com
apollo conversations export-status --id <export_id>
```

Search filters: `--type video_conference|phone_call`, `--account-id`, `--contact-ids`, `--tag-ids`, `--tracker-ids`, `--organization-ids`, `--date-from`/`--date-to` (ISO 8601, GMT), `--sort-by`, `--limit`, `--page`.

---

### Webhook results

```bash
apollo webhooks result --request-id <id>   # poll the stored result of an async (webhook-based) request
```

---

### Phone calls

```bash
apollo calls log --to 555-303-1234 --duration 120 --note "Voicemail left" --contact-id <id>
apollo calls search --contact-id <id> --per-page 25
apollo calls update --id <call_id> --note "Connected — interested" --outcome-id <id>
```

---

### Tasks

Apollo requires each task be tied to a contact, account, or opportunity in addition to `--user-id` and `--type`.

```bash
apollo tasks create --user-id <user_id> --type action_item --title "Follow up" --priority medium --contact-id <id>
apollo tasks bulk-create --file ./tasks.json
apollo tasks search --priority high --per-page 25
apollo tasks show --id <task_id>
apollo tasks update --id <task_id> --priority high --due-at 2026-08-01T09:00:00Z
apollo tasks complete --id <task_id> --note "Called and connected"
apollo tasks skip --id <task_id> --note "No longer relevant"
```

Useful task `--type` values: `action_item`, `call`, `linkedin_step_message`.

---

### Users

```bash
apollo users profile                # current user profile
apollo users profile --credits      # + credit usage
apollo users search --query alice   # find teammates (returns user IDs for owner_id / user_id fields elsewhere)
```

---

### Email accounts

```bash
apollo email-accounts list
```

Returns connected sending inboxes. **Always call this before `sequences add-contacts`** to get a valid `--from-email-account` id; never invent one.

---

### Usage / credits

```bash
apollo usage credits   # team-wide credit_usage_stats (lead / direct_dial / export / conversation / ai / power_up)
apollo usage api       # per-endpoint API usage stats and rate limits
```

For a single user's balance, prefer `apollo users profile --credits`.

---

### Analytics

`analytics report` is a payload pass-through to `/api/v1/reports/sync_report`. Apollo expects fully-built metric/group_by/sort objects (not bare strings); the CLI does **not** transform simplified input. Build the body in a JSON file and pass `--payload`.

```bash
apollo analytics report --payload ./report.json
```

Minimal payload (each metric needs `value`, `smart_datetime_reference`, and `smart_user_id_reference`):

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

## Global flags

These flags are accepted by every command and must be placed before the subcommand:

| Flag | Description |
|---|---|
| `--add-header <key:value>` | Inject a custom HTTP header into the request. Repeatable. Header names are normalized to lowercase. |

```bash
apollo --add-header x-request-id:abc123 people search --q-keywords "Jane"
```

## Output formats

Every subcommand accepts `-f, --format <format>`:

| Format | When to use |
|---|---|
| `json` (default) | Pretty-printed JSON. Pipe to `jq` for field extraction. |
| `jsonl` | One JSON object per line. Stream into log/data pipelines. |
| `csv` | Flat CSV with headers; nested objects/arrays are stringified. Open in spreadsheets or feed to `mlr`/`csvkit`. |
| `yaml` | Human-readable YAML. Good for inspecting deeply nested responses. |
| `table` | ASCII bordered table. Good for terminal browsing of small responses. |

```bash
apollo companies search --industry saas --format table
apollo people bulk-enrich --emails a@b.com c@d.com --format jsonl
apollo news search --company Stripe --format yaml
```

For nested responses (search/list endpoints with pagination + items), prefer `json` + `jq` or `yaml`. `csv`/`table` will stringify nested structures into a single cell.

## Piping with jq

For default JSON output, use `jq` to extract specific fields:

```bash
# Names and titles of VPs at Stripe
apollo people search --title "VP Engineering" --domain stripe.com \
  | jq '.people[] | {name, title}'

# All job posting titles at a company
apollo companies jobs --id abc123 \
  | jq '.organization_job_postings[].title'

# Primary domains of Series B SaaS companies in the US
apollo companies search --industry SaaS --funding "5000000,20000000" --location "United States" \
  | jq '.accounts[].primary_domain'
```

## JSON Response Keys

| Command | Top-level key |
|---|---|
| `people search` / `people employees` | `.people[]` |
| `people enrich` | `.person` |
| `people bulk-enrich` | `.matches[]` |
| `people get` | `.person` |
| `companies search` | `.accounts[]` |
| `companies enrich` / `companies bulk-enrich` | `.organization` / `.organizations[]` |
| `companies get` | `.organization` |
| `companies jobs` | `.organization_job_postings[]` |
| `news search` | `.news_articles[]` |
| `contacts search` | `.contacts[]` (+ `.pagination`) |
| `contacts create` / `contacts update` / `contacts show` | `.contact` |
| `contacts deals` | `.opportunities[]` |
| `contacts bulk-create` | `.created_contacts[]` |
| `contacts bulk-update` / `contacts update-stages` / `contacts update-owners` | `.contacts[]` |
| `contacts stages` | `.contact_stages[]` |
| `accounts create` / `accounts update` / `accounts show` | `.account` |
| `accounts search` | `.accounts[]` (+ `.pagination`) |
| `accounts bulk-create` | `.created_accounts[]` |
| `accounts bulk-update` / `accounts update-owners` | `.accounts[]` |
| `accounts stages` | `.account_stages[]` |
| `deals create` / `deals show` / `deals update` | `.opportunity` |
| `deals search` | `.opportunities[]` |
| `deals stages` | `.opportunity_stages[]` |
| `sequences search` | `.emailer_campaigns[]` (+ `.pagination`) |
| `sequences add-contacts` / `sequences remove-contacts` | varies — confirmation payload |
| `sequences abort` / `sequences archive` | `.emailer_campaign` |
| `emails draft` | `.emailer_message` |
| `emails send` / `emails status` | send-status payload |
| `emails stats` | `.emailer_message` with activity fields |
| `emails search` | `.emailer_messages[]` (+ `.pagination`) |
| `labels list` / `labels create` / `labels update` | `.labels[]` / `.label` |
| `labels add` / `labels remove` | updated `.labels[]` (or `.entity_progress_job` with `--async`) |
| `fields list` / `fields custom` | `.fields[]` / `.typed_custom_fields[]` |
| `notes list` | `.notes[]` |
| `conversations search` | `.conversations[]` |
| `conversations show` | conversation object |
| `conversations export` / `conversations export-status` | export-job payload |
| `calls log` / `calls update` | `.phone_call` |
| `calls search` | `.phone_calls[]` |
| `tasks create` / `tasks show` / `tasks update` | `.task` |
| `tasks bulk-create` | `.tasks[]` (or similar bulk wrapper) |
| `tasks search` | `.tasks[]` |
| `tasks complete` / `tasks skip` | confirmation payload |
| `users profile` | top-level user object (no wrapper); credit fields appear with `--credits` |
| `users search` | `.users[]` (+ `.pagination`) |
| `email-accounts list` | `.email_accounts[]` |
| `usage credits` | `.credit_usage_stats` (object keyed by credit type) |
| `usage api` | per-endpoint usage/rate-limit object |
| `webhooks result` | stored webhook payload |
| `analytics report` | `.response` (primary result data), `.incompatible_filters`, `.computed_filters`, `.goals` |
