# `features/instance-settings` — agent guide

The settings of the server, for the instance admins (`scylla.platform.v1.SettingsService`), and
the mail server of the instance (`scylla.platform.v1.MailSettingsService`).

**Layer** `features/` · **id** `instance-settings` · **DI keys** `instanceSettingsRepository`,
`mailSettingsRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.

## What it does

- The page `/admin/settings` has the limit of the workspaces that one user creates, and
  Security, with the switch of the personal
  tokens. Turning it off asks for a confirmation that gives the number of active tokens
  (`activePersonalTokens`). Turning it on needs no confirmation.
- When the switch is off, each personal token stops and no one can make a new one. The tokens of
  the apps and the CI identities do not change. The account page shows this state
  (`features/user`), and the switch of a workspace is locked (`features/workspace`).
- The route and the switch use `MANAGE_INSTANCE_SETTINGS`, which asks the server for
  `update_instance_settings` on the platform: an instance admin holds it.

## The mail page

- The page `/admin/mail` (nav "Mail", after Settings) sets the SMTP relay that sends the mails
  of the server: host, port, security (`tls`, `starttls`, `none`), user name, password or API
  key, sender address and name. A save applies at once on the server, with no restart.
- **The password is write-only.** The API gives `passwordSet` only. The field is always empty;
  an empty field keeps the saved password (`password` stays unset in the request). With no user
  name, the server forgets the password. Never show, log or test a real password.
- **Presets** (`domain/structs/mail-provider.struct.ts`): Scaleway TEM, LWS, Brevo, Postmark,
  Amazon SES and Mailjet, from the documentation of each provider. A preset fills the host, the
  port and the security; a host of the same provider stays (the region of SES, the server of
  LWS, which LWS Panel shows for each address). The hint of each provider tells what the user
  name and the password are (`mailSettingsMessages.providerHints`).
- **The test mail** goes at once through the saved settings, not the draft. The page shows the
  answer of the relay (host, reply, queue ID) or its error. With no relay and no default mailer
  (`defaultHost` empty), the server has none: the test is locked.
- **Use the server default** (a `DangerZone`, with a confirmation) removes the relay and its
  password: the server uses `SCYLLA_SMTP_URL` again, or its log mailer.
- The form state is `ui/MailSettings/mail-relay-form.state.svelte.ts`, over the plain functions of
  `presentation/mappers/mail-relay-draft.mapper.ts`. The query does not refetch on focus: the
  page holds a draft.
- Every route and control uses `MANAGE_INSTANCE_SETTINGS`, like the settings page.
