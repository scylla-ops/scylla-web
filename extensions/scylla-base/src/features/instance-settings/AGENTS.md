# `features/instance-settings` — agent guide

The settings of the server, for the instance admins (`scylla.platform.v1.SettingsService`).

**Layer** `features/` · **id** `instance-settings` · **DI key** `instanceSettingsRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.

## What it does

- The page `/instance/settings` has one section today: Security, with the switch of the personal
  tokens. Turning it off asks for a confirmation that gives the number of active tokens
  (`activePersonalTokens`). Turning it on needs no confirmation.
- When the switch is off, each personal token stops and no one can make a new one. The tokens of
  the apps and the CI identities do not change. The account page shows this state
  (`features/user`), and the switch of a workspace is locked (`features/workspace`).
- The route uses `MANAGE_ROLES`, as `extensions` does, to mean an instance admin.
