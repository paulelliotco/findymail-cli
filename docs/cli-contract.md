# CLI Contract

This CLI is designed for coding agents first.

## Guarantees

1. No interactive prompts.
2. Success payloads go to `stdout` as JSON.
3. Error payloads go to `stderr` as JSON.
4. API auth comes from `FINDYMAIL_API_KEY`.
5. `FINDYMAIL_BASE_URL` can override the default API host for tests.
6. `FINDYMAIL_TIMEOUT_MS` configures the per-request HTTP timeout.
7. Local usage and config failures exit with code `2`.
8. Remote/API/network failures exit with code `1`.
9. POST-style commands accept exactly one of `--json`, `--input`, or `--stdin`.
10. `--stdin` rejects interactive terminal input.
11. Intellimatch polling is opt-in via `--wait` and bounded by `--max-wait`.

## Confirmed Endpoints Covered

- `POST /api/verify`
- `POST /api/search/name`
- `POST /api/search/domain`
- `POST /api/search/company`
- `POST /api/search/employees`
- `POST /api/search/reverse-email`
- `POST /api/search/phone`
- `POST /api/intellimatch/search`
- `GET /api/intellimatch/status`
- `GET /api/lists`
- `POST /api/lists`
- `DELETE /api/lists/{id}`
- `GET /api/contacts/get/{id}`
