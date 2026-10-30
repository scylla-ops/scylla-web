# Shared (scylla-base)

> [Scylla frontend](../../../../README.md) › `extensions/scylla-base` › `shared/` ·
> [agent guide](./AGENTS.md) · [architecture](../../../../docs/architecture.md)

What the Scylla features share and what has a meaning only for Scylla: the error type of the
backend calls, the presentation of a run status, the instructions to start an agent, how a
person shows, and the account rules checked before a call.

The generic parts — tables, forms, dialogs, the primitives — are in
[`@scylla/ui`](../../../../packages/ui/README.md). This folder holds what fails the test of that
package, *"could this live in another product, unchanged?"*, but is still used by two features.

## `ScyllaError` — one error type, made at one place

A backend call that fails rejects with a `ScyllaError`: the status code, the server message, and
a message for the user. The [gRPC transport](../platform/grpc/README.md) makes it, for every call
of every feature and of every extension. A repository only awaits its call, and a query only
returns the call of its repository.

There is no Result type. TanStack Query already holds the success or the failure of each call,
and it reads a failure from a rejected promise. A Result would be made in the repository only to
be thrown again in each `queryFn`. The two places that must see an error see it: the
`onQueryError` of the [shell](../shell/README.md) shows the one toast, and its retry policy
retries only the failures that a second call can pass (a network failure, a busy server). A
refusal (`NOT_FOUND`, `PERMISSION_DENIED`) goes to the page at once.

The message for the user is the server message only when the user can act on it: a name already
taken, a field the server refuses. A server fault or a bug in the page shows a generic message,
never its own text.

`ScyllaError` is also the contract of other extensions that call the Scylla backend:
[`@scylla/base-sdk`](../../../../sdks/scylla-base-sdk/README.md) exports it.

Some refusals are not errors for the page: a wrong current password, or a link that expired.
The page shows them beside its form, so `refusalOf` gives a FAILED_PRECONDITION back as data
instead of throwing it to that toast, which would show the same message a second time.

## A person shows one way

`UserIdentity` shows a person in every place the app names one: the user menu, the lists of
users and members, the holders of a role. The same initials, the same name (the display name,
else the username), the same second line (the email, else `@username`) make one person
recognizable from page to page. A user that no list knows any more shows as "Deleted user": an
id means nothing to the reader. It lives here, not in `features/user`, because a feature cannot
import another feature's components, and four features show people.

## The account rules

The forms of [login](../features/login/README.md) and [user](../features/user/README.md) check
an email, a new password and its confirmation with the same rules as the backend, before the
call. The browser does not check them: its tooltips are not translated and do not say the
rule. One file holds the rules, so the two features cannot disagree.

## One borderline case

`status-config.ts` and `job-status.utils.ts` encode how a status is *presented* — its colour,
icon and label. What a status *means* — whether a job is running or finished — lives in
[features/jobs](../features/jobs/README.md) as domain logic. Keep the line there.
