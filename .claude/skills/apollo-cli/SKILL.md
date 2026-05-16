---
name: apollo-cli
description: This skill should be used when searching for people, companies, employees, job postings, or news, OR when driving CRM data (contacts, accounts, deals), sequences, phone calls, tasks, analytics, or credit usage in Apollo.io from the terminal. Activates when the user asks to "find people", "search companies", "enrich a contact", "look up employees", "find jobs at a company", "get company news", "create a contact / account / deal", "log a call", "create a task", "add to sequence", "check analytics", "view credit usage", or any task involving Apollo.io data lookup or CRM writes from the terminal.
version: 3.0.0
---

# Apollo CLI Skill

Use the `apollo` CLI to drive Apollo.io end to end: search/enrich people and companies, surface news and job postings, manage CRM contacts/accounts/deals, drive sequences, log phone calls and tasks, pull analytics, and inspect credit usage. Output defaults to JSON for `jq` piping; use `-f, --format` to switch to `jsonl`, `csv`, `yaml`, or `table`.

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

**Enrich a person (provide at least one identifier):**

```bash
apollo people enrich --email jane@acme.com
apollo people enrich --linkedin https://linkedin.com/in/janedoe
apollo people enrich --first-name Jane --last-name Doe --company acme.com
apollo people enrich --name "Jane Doe" --company acme.com
```

**Bulk enrich multiple people by email:**

```bash
apollo people bulk-enrich --emails jane@acme.com john@acme.com
```

**Request an email address by Apollo person ID:**

```bash
apollo people email --id <apollo_person_id>
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

**Enrich a company by domain or name:**

```bash
apollo companies enrich --domain stripe.com
apollo companies enrich --name "Stripe"
```

**Bulk enrich multiple companies by domain:**

```bash
apollo companies bulk-enrich --domains stripe.com acme.com notion.so
```

**Get full company details by Apollo organization ID:**

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

**Bulk-create from a JSON file (array, or `{ "contacts": [...] }`):**

```bash
apollo contacts bulk-create --file ./contacts.json
```

---

### Accounts (CRM companies)

```bash
apollo accounts create --name "Acme Co" --domain acme.com
apollo accounts update --id <account_id> --phone 555-303-1234
apollo accounts bulk-create --file ./accounts.json
```

---

### Deals (opportunities)

```bash
apollo deals create --name "Acme - Q2 Renewal" --amount 50000 --currency USD --account-id <id> --close-date 2026-06-30
apollo deals search --account-id <id> --per-page 25
apollo deals show --id <opportunity_id>
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
| `companies search` | `.accounts[]` |
| `companies enrich` / `companies bulk-enrich` | `.organization` / `.organizations[]` |
| `companies get` | `.accounts[0]` (filtered by org ID via mixed_companies/search) |
| `companies jobs` | `.organization_job_postings[]` |
| `news search` | `.news_articles[]` |
| `contacts search` | `.contacts[]` (+ `.pagination`) |
| `contacts create` / `contacts update` | `.contact` |
| `contacts bulk-create` | `.created_contacts[]` |
| `accounts create` / `accounts update` | `.account` |
| `accounts bulk-create` | `.created_accounts[]` |
| `deals create` / `deals show` | `.opportunity` |
| `deals search` | `.opportunities[]` |
| `sequences search` | `.emailer_campaigns[]` (+ `.pagination`) |
| `sequences add-contacts` / `sequences remove-contacts` | varies — confirmation payload |
| `calls log` / `calls update` | `.phone_call` |
| `calls search` | `.phone_calls[]` |
| `tasks create` | `.task` |
| `tasks bulk-create` | `.tasks[]` (or similar bulk wrapper) |
| `tasks search` | `.tasks[]` |
| `users profile` | top-level user object (no wrapper); credit fields appear with `--credits` |
| `users search` | `.users[]` (+ `.pagination`) |
| `email-accounts list` | `.email_accounts[]` |
| `usage credits` | `.credit_usage_stats` (object keyed by credit type) |
| `analytics report` | `.response` (primary result data), `.incompatible_filters`, `.computed_filters`, `.goals` |
