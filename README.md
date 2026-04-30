# apollo-io-cli

A command-line interface for the [Apollo.io API](https://apolloio.github.io/apollo-api-docs/). Search and enrich people and companies, find job postings, and surface news — all from your terminal, pipeable with `jq` and switchable to CSV / YAML / JSONL / table output.

<img width="1908" height="2294" alt="image" src="https://github.com/user-attachments/assets/eb7ebc43-1c64-466d-8959-e9c6e185433a" />

## Installation

### Download a prebuilt binary (no Node required)

Download the latest binary for your platform from the [releases page](https://github.com/apolloio/apollo-io-cli/releases):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `apollo-macos-arm64` |
| macOS (Intel) | `apollo-macos-x64` |
| Linux (x64) | `apollo-linux-x64` |

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

### `apollo auth`

| Command | Description |
|---|---|
| `apollo auth login` | Authorize via browser OAuth, saves token to `~/.config/apollo/credentials` |
| `apollo auth logout` | Revoke token and remove saved credentials |
| `apollo auth whoami` | Show whether you're logged in |

---

## Using with AI Agents

This repository includes a Claude Code skill at `.claude/skills/apollo-cli/SKILL.md` that gives AI agents full knowledge of the CLI's commands, options, and JSON response shapes. Agents working in this repo will automatically use it.

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
> apollo companies search --industry saas --format json | jq '.organizations[]' --compact-output > orgs.jsonl
> ```

## Piping with jq

Default JSON output is composable with `jq`:

```bash
# Get names and titles of VP Engineering at Stripe
apollo people search --title "VP Engineering" --city "San Francisco" --domain stripe.com \
  | jq '.people[] | {name: .name, title: .title}'

# Get all job posting titles at a company
apollo companies jobs --id abc123 \
  | jq '.job_postings[].title'

# Find Series B SaaS companies in the US and extract their domains
apollo companies search --industry SaaS --funding "5000000,20000000" --location "United States" \
  | jq '.organizations[].primary_domain'
```

