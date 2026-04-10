# findymail-cli

Independent, unofficial CLI for the Findymail API. It is not affiliated with, endorsed by, or maintained by Findymail.

Agent-friendly CLI for the Findymail API.

It wraps the confirmed Findymail endpoints behind a non-interactive JSON-first shell interface so coding agents can call it reliably.

## Features

- non-interactive command surface
- JSON in, JSON out
- structured JSON errors on `stderr`
- bearer auth from `FINDYMAIL_API_KEY`
- optional `FINDYMAIL_BASE_URL` override for local testing
- optional `FINDYMAIL_TIMEOUT_MS` override for HTTP timeout control
- bounded `--wait` support for Intellimatch polling

## Install

```bash
npm install -g @paulelliot/findymail-cli
```

Or install it locally in a project and run it with `npx`:

```bash
npm install @paulelliot/findymail-cli
npx findymail --help
```

For local development:

```bash
pnpm install
pnpm build
pnpm dev -- --help
```

## Auth

```bash
export FINDYMAIL_API_KEY=your_api_key
```

For tests or alternate environments:

```bash
export FINDYMAIL_BASE_URL=http://127.0.0.1:3000
export FINDYMAIL_TIMEOUT_MS=30000
```

## Commands

### Verify

```bash
findymail verify --json '{"email":"name@company.com"}'
cat payload.json | findymail verify --stdin
```

`--stdin` is pipe-only. The CLI refuses to read interactive terminal input.

### Search

```bash
findymail search business-profile --json '{"linkedin_url":"https://linkedin.com/in/ada"}'
findymail search name --json '{"name":"Ada Lovelace","domain":"example.com"}'
findymail search domain --json '{"domain":"example.com","roles":["CEO"]}'
findymail search company --json '{"domain":"example.com"}'
findymail search employees --json '{"website":"example.com","job_titles":["CEO"],"count":1}'
findymail search reverse-email --json '{"email":"ada@example.com","with_profile":true}'
findymail search phone --json '{"linkedin_url":"https://linkedin.com/in/ada"}'
```

### Lists And Contacts

```bash
findymail lists get
findymail lists create --json '{"name":"VIPs"}'
findymail lists delete --id 42
findymail contacts get --id 0
```

### Intellimatch

```bash
findymail intellimatch search --json '{"query":"SaaS companies in US"}'
findymail intellimatch status --hash job-123
findymail intellimatch search --json '{"query":"SaaS companies in US"}' --wait --poll-interval 1000 --max-wait 30000
```

## Output Contract

Successful commands print raw API JSON to `stdout`.

Errors print structured JSON to `stderr`:

```json
{
  "ok": false,
  "error": {
    "type": "usage",
    "message": "Provide exactly one of --json, --input, or --stdin"
  }
}
```

## Validation

```bash
pnpm test
pnpm build
```
