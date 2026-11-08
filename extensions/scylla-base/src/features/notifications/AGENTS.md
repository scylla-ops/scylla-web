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
- The panel is short: no filter, no time label, and one action in a row. "Mark all as read" shows
  only when `unread > needsAction`, because the server skips a row that waits for an answer.
- While the list loads, the panel shows one skeleton row for each unread row, from 1 to 8
  (`panelSkeletonRows`). Each unread row is in the list, thus the panel does not open large and
  then shrink. The panel follows the height of its content with a 200 ms transition
  (`followContentHeight`), and the skeleton and the list cross-fade. A reduced motion stops the
  height transition. The fade stays, because it moves nothing.
- The page is one route, `notifications/:view`, on the `workspace` and `personal` mounts. The views
  are in `notification-views.registry.ts`: its links are in the section `notifications` of the
  second sidebar, and the personal mount has `NotificationsNav` in the page. The list has a
  selection, pages and the keys `J`, `K`, `Enter`, `U`, `E`, `X`.
- A view is one link, so two views do not combine: there is no "unread in security". The workspace
  select is apart, and it stays on a change of view.
- A category of an edition has no link. Its rows stay in "Inbox".
- A view with a filter has no row in the command bar (`inCommandBar: false`), because "Unread" or
  "Security" is no place to go to. The command `notifications.open` opens the inbox, and "Failed
  runs" keeps its row.
- A row holds a kind and its parameters. `presentation/presenters/kind-views.ts` makes the text in
  the language of the reader.
- The view "Failed runs" is on the page, not in the panel, only for a caller with
  `LIST_JOBS_BY_WORKSPACE`. It reads the last 100 jobs of the workspace. It goes when the server has
  a kind for a failed job. Until then, the bell shows no failed run.

## Rules

- A new kind of the core needs a view in `kind-views.ts`, and its key in the list of
  `kind-views.test.ts`. An edition adds a view with `notificationsPoints.kinds.patch`.
- A kind with no view shows a generic line and no link. It must never fail.
- A parameter is a text from the server. `added` and `removed` are JSON lists: a bad value gives no
  text, not an error.
- An empty list never says that all is well: the empty list does not prove this.
- A failed read of the counts keeps the last number, with no toast (`showsOwnError`).
- A row that waits for an answer has no "Mark as read": the server keeps it unread.
- In the panel a row has no read toggle, so a click on the row marks it as read, with or without a
  link.
- With a mouse, the actions of a row take the cell of the time on hover. A touch screen has no
  hover: both show, so an invisible button is never pressed by accident.
- The answers to an invitation are in `features/invitation`: `acceptById` and `decline`.
  `INVITATION_FOR_ANOTHER_EMAIL` keeps the row and shows its own text.

## File map

- `domain/`: the entity and the repository interface.
- `infrastructure/default-notification.repository.ts`: the gRPC calls, and the state of an
  invitation as a union.
- `presentation/notifications.queries.ts`: the counts, the list, the changes.
- `presentation/notifications.commands.ts`: the two rows of the command bar: the page, and mark all as read.
- `presentation/notifications.points.ts`: `KindView`, and the point of the views.
- `presentation/presenters/`: `kind-views`, `sections` (the groups of the page and of the panel),
  `bell`, `page-keys`.
- `presentation/ui/NotificationRow/`: a row, the list with its states, the body of an invitation.
- `presentation/ui/NotificationsPanel/`: the content of the popover, and the attachment that gives
  it the height of its content.
- `presentation/ui/Notifications/`: the full page, its views, its list and its state, and the failed
  runs.
