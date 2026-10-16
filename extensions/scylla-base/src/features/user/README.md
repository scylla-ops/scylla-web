# User

> [Scylla frontend](../../../../../README.md) › `features/` › **user** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

User accounts: the human principals of the system. This module covers three screens: the
administrator's directory of every account, the page of one account for an administrator, and
the account page of the signed-in user.

## System-wide, not organization-scoped

The user directory sits in the sidebar's **System** section, not the organization section, and
that placement is the module's defining fact: it lists every account in the Scylla installation,
regardless of which organization you happen to be viewing.

The question "who is in *this* organization?" is a different one, answered by
[membership](../membership/README.md) from grants. Filtering this directory by the current
organization would quietly conflate the two, and an administrator would lose the only view of
all accounts.

## Who is a person

An account has an id, an email, a username and an optional display name. The username is a
handle: unique, without '@', and shown as `@username`. The display name is what people read.
One component shows a person everywhere, `UserIdentity` in `shared/`: initials, then the display
name (else the username), then the email when it is known (else the handle). A user that no list
knows any more shows as "Deleted user", never as an id. `UserSummary` is the part of a user that
it needs, and the member lists of other modules return that type.

## Three screens

**The directory** (`/:org/users`, behind `LIST_USERS`) is a paginated table with each person and
the status of the account, a "New user" dialog and a deletion of the selection.

**The page of a user** (`/:org/users/:userId`, behind `READ_USER`) is the administrator's view
of one account: an identity card (status, creation date, id), its profile, its organizations and
roles, its sessions, the security actions (a reset link, the deactivation) and the deletion. Each
action shows only to a viewer with the permission of its RPC, because a button that the server
would refuse is noise.

**The account page** (`/:org/account`) is the signed-in user's own page: an identity card,
profile, password, sessions, organizations and roles, and the deletion of the account. The backend lets a user act
on the own account with no grant, so this page carries no permission. It exists at two
addresses: `/:org/account` inside the frame of an organization, and `/account` with a plain
layout, for a user who has no organization yet (an account that an administrator made, a new
sign-up) and must still change the password or delete the account. The two pages look alike
but are separate on purpose: the own account changes the password with the current one, cannot
change its email or deactivate itself, and deletes itself with its password. The page of a user
sends the own id to the account page.

## Sessions

A session is one sign-in: a browser, a phone or an API client. The list shows what the server
recorded when the session opened (the user agent and the IP address) and the last activity. It
shows no token, and a session id cannot authenticate a call. The app reads the user agent itself
(`parseUserAgent`): there is no location lookup. A user can sign out each other session, or all
of them at once. The current session cannot be signed out from the list: "Sign out" in the menu
does that.

## Answers that are not errors

Two calls of the account page can fail in a way that the user must read beside the form: a wrong
current password, and a deletion that the server refuses because the user is the last
administrator of an organization (the message names those organizations). The queries give
these refusals back as data, so the page shows them in place and the global error toast does not
show them a second time.

## Structure

Standard three layers, with the data source implementation using the `.impl.ts` file suffix
(`user-remote.data-source.impl.ts`) rather than the `data/remote/grpc-*` naming used by newer
modules. Both spellings exist in the codebase; match whichever file you are editing rather than
converting one to the other.

The two pages each have a view model (`account-page.state.svelte.ts`,
`user-detail.state.svelte.ts`) and share their sections: the profile form, the list of
organizations and roles, and the frame of a section.

## Related modules

- [membership](../membership/README.md) — users as members of an org or project.
- [roles](../roles/README.md) — users as grant-holding principals.
- [login](../login/README.md): how a user signs in, signs out and resets a password.
- [apps](../apps/README.md) — the non-human principals.
