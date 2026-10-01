# Auth

> [Scylla frontend](../../../../../README.md) › `scylla-cloud` › `features/` › **auth** ·
> [agent guide](./AGENTS.md)

Self-service sign-up for the cloud build, and the two changes it makes to `scylla-base`'s login
page so the two feel like one product.

## The two things this feature does

**It adds a page.** `/register` collects a username, an email, a password and an organization
name, and calls the backend's `RegistrationService.Signup` — one RPC that creates the user, the
organization, and grants the user `organization-admin` on it, in one transaction. A success
opens a session exactly the way signing in does (through `openSession`, exported by
`scylla-base`'s `login` feature) and redirects to `/`.

**It changes a page it does not own.** The login page is `scylla-base`'s, and a cloud account
signs in with an email, with a link to create an account — neither of which belongs in the base
product. Rather than fork the page, `auth` declares two **widget injections**: typed changes to
the points `scylla-base`'s login page opens on purpose. See `widgets_plan.md` at the repo root
for why this is a value exported from a barrel and not a global name, and the feature's own
`AGENTS.md` for exactly which points each injection touches.

## Why this is one feature, not two

A module and its widget injections could in principle live apart. They stay together because
they serve one user-visible goal — "a cloud account can sign up and sign in with an email" — and
splitting them would mean touching two folders for one change in either direction. If a second,
unrelated reason to inject into another extension's widgets ever shows up, it gets its own
feature; this one stays about sign-up.

## What v1 does not do

No GitHub or other OAuth provider, no email verification, no password reset, no capability check
against the server (the sign-up link always shows, even on a server built without the `register`
feature — it then fails at submit time with a clear message). `scylla-cloud-v1_plan.md` §1.2 and
§6 have the full list and the reasoning.

## Related modules

- [`login`](../../../../scylla-base/src/features/login/README.md) (in `scylla-base`) — the page
  this feature's widget injections change, and the owner of `openSession`.
- [`widgets_plan.md`](../../../../../widgets_plan.md) — the widget injection mechanism.
- [`scylla-cloud-v1_plan.md`](../../../../../scylla-cloud-v1_plan.md) — the plan this feature was
  built from.
