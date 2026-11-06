# `features/notifications`: agent guide

The inbox of the signed-in user (`scylla.notifications.v1.NotificationService`).

**Layer** `features/` · **id** `notifications` · **DI keys** `notificationRepository` · **points** `kinds`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## What it does

- The shell keeps the bell (`NotificationsMenu`): it reads the counts each 30 s (the server gives
  the time) and loads `NotificationsPanel` when it opens. The bell is also on `FirstWorkspace` and
  on the personal layout, so a user with no workspace sees an invitation.
- The page `/:workspaceSlug/notifications` and the personal page `/notifications` show the same
  list, with filters, a selection, pages and the keys `J`, `K`, `Enter`, `U`, `E`, `X`.
- A row holds a kind and its parameters. `presentation/presenters/kind-views.ts` makes the text in
  the language of the reader.
- The panel has a tab "Failed runs" only for a caller with `LIST_JOBS_BY_WORKSPACE`. It goes when
  the server has a kind for a failed job.

## Rules

- A new kind of the core needs a view in `kind-views.ts`, and its key in the list of
  `kind-views.test.ts`. An edition adds a view with `notificationsPoints.kinds.patch`.
- A kind with no view shows a generic line and no link. It must never fail.
- A parameter is a text from the server. `added` and `removed` are JSON lists: a bad value gives no
  text, not an error.
- An empty list never says that all is well: the empty list does not prove this.
- A failed read of the counts keeps the last number, with no toast (`showsOwnError`).
- A row that waits for an answer has no "Mark as read": the server keeps it unread.
- The answers to an invitation are in `features/invitation`: `acceptById` and `decline`.
  `INVITATION_FOR_ANOTHER_EMAIL` keeps the row and shows its own text.

## File map

- `domain/`: the entity and the repository interface.
- `infrastructure/default-notification.repository.ts`: the gRPC calls, and the state of an
  invitation as a union.
- `presentation/notifications.queries.ts`: the counts, the list, the changes.
- `presentation/notifications.commands.ts`: the two rows of the command bar: the page, and mark all as read.
- `presentation/notifications.points.ts`: `KindView`, and the point of the views.
- `presentation/presenters/`: `kind-views`, `sections` (the time groups), `bell`, `categories`,
  `page-keys`.
- `presentation/ui/NotificationRow/`: a row, the list with its states, the body of an invitation.
- `presentation/ui/NotificationsPanel/`: the content of the popover, and the failed runs.
- `presentation/ui/Notifications/`: the full page and its state.
