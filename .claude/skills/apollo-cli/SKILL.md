---
name: apollo-cli
description: This skill should be used when searching for people, companies, employees, job postings, or news using the Apollo.io CLI. Activates when the user asks to "find people", "search companies", "enrich a contact", "look up employees", "find jobs at a company", "get company news", or any task involving Apollo.io data lookup from the terminal.
version: 1.0.0
---

# Apollo CLI Skill

Use the `apollo` CLI to search and enrich people and companies, find job postings, and surface news from Apollo.io. Output defaults to JSON for `jq` piping; use `-f, --format` to switch to `jsonl`, `csv`, `yaml`, or `table`.

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
  | jq '.job_postings[].title'

# Primary domains of Series B SaaS companies in the US
apollo companies search --industry SaaS --funding "5000000,20000000" --location "United States" \
  | jq '.organizations[].primary_domain'
```

## JSON Response Keys

| Command | Top-level key |
|---|---|
| `people search` / `people employees` | `.people[]` |
| `people enrich` | `.person` |
| `people bulk-enrich` | `.matches[]` |
| `companies search` | `.organizations[]` |
| `companies enrich` / `companies get` | `.organization` |
| `companies jobs` | `.job_postings[]` |
| `news search` | `.news_articles[]` |
