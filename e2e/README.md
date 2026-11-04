# End-to-end tests

A real browser (Playwright) against a real CE server, its Postgres, SpiceDB and Mailpit. Vitest
never runs them: the specs end in `.e2e.ts`.

## The server

From `ce/` of the backend, with the dev keys of its `.env`:

```bash
just db-up && just schema
pnpm --dir <scylla-web> exec vite build          # the app goes to <scylla-web>/dist
SCYLLA_WEB_DIR=<scylla-web>/dist SCYLLA_SIGN_UP_MODE=open cargo run -p scylla-ce -- serve
```

The server serves the app itself, on its own origin: the session cookie and its refresh work
with no CORS setting.

## The run

```bash
SCYLLA_AGENT_BIN=<backend>/ce/target/debug/scylla-agent pnpm e2e
```

| Variable             | Default                  |                                                                  |
| -------------------- | ------------------------ | ---------------------------------------------------------------- |
| `SCYLLA_E2E_URL`     | `http://127.0.0.1:3000`  | the CE server                                                    |
| `SCYLLA_E2E_MAILPIT` | `http://127.0.0.1:51080` | the API of Mailpit (`docker-compose.yml` of the backend)         |
| `SCYLLA_AGENT_BIN`   | none                     | the `scylla-agent` binary; without it, the agent spec is skipped |

Each spec makes its own users, so a run needs no reset of the database.
