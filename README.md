# apollo-io-cli

A command-line interface for the [Apollo.io API](https://apolloio.github.io/apollo-api-docs/). Search and enrich people and companies, find job postings, and surface news — all from your terminal, pipeable with `jq`.

## Installation

```bash
npm install
npm link        # makes `apollo` available globally
```

Requires Node 18+.

## Authentication

Get your API key from [Apollo.io Settings → Integrations → API](https://app.apollo.io/#/settings/integrations/api).

```bash
apollo auth login <your-api-key>   # saves to ~/.config/apollo/credentials
apollo auth whoami                 # confirm which key is active
apollo auth logout                 # remove saved credentials
```

The API key is resolved in this order:

1. `APOLLO_API_KEY` environment variable
2. `~/.config/apollo/credentials`

## Commands

### `apollo people`

#### `search`

Search Apollo's database for people.

```bash
apollo people search --title "VP Engineering" --location "San Francisco"
apollo people search --title "CTO" --seniority c_suite --domain stripe.com
apollo people search --department engineering --technology react --per-page 25
```

| Option | Description |
|---|---|
| `-q, --query` | Name or keyword query |
| `--title` | Job title(s) |
| `--location` | Location(s) (city, state, country) |
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

### `apollo auth`

| Command | Description |
|---|---|
| `apollo auth login <key>` | Save API key to `~/.config/apollo/credentials` |
| `apollo auth logout` | Remove saved credentials |
| `apollo auth whoami` | Show which key is active |

---

## Piping with jq

All commands output JSON to stdout, making them composable with `jq`:

```bash
# Get names and titles of VP Engineering at Stripe
apollo people search --title "VP Engineering" --domain stripe.com \
  | jq '.people[] | {name: .name, title: .title}'

# Get all job posting titles at a company
apollo companies jobs --id abc123 \
  | jq '.job_postings[].title'

# Find Series B SaaS companies in the US and extract their domains
apollo companies search --industry SaaS --funding "5000000,20000000" --location "United States" \
  | jq '.organizations[].primary_domain'
```

## Environment Variables

| Variable | Description |
|---|---|
| `APOLLO_API_KEY` | API key (takes precedence over credentials file) |
