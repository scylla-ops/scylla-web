# `features/invitation` — agent guide

The invitations to a workspace, by email (`scylla.workspaces.v1.InvitationService`).

**Layer** `features/` · **id** `invitation` · **DI keys** `invitationRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## What it does

- `InviteDialog` sends an invitation with a fixed role of the workspace; `PendingInvitations`
  lists the open ones, with resend (a cooldown: `RESEND_TOO_SOON`) and revoke. The members page
  of `membership` loads both with `loadInviteDialog` and `loadPendingInvitations`.
- The public page `accept-invitation` reads the token of the mail link from the fragment.
  Signed in: `AcceptInvitation`, then the workspace opens. Signed out: a link to the sign-in page
  that comes back here, and a link to the sign-up page with the invitation.
