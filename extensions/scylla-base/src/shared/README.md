# Shared (scylla-base)

> [Scylla frontend](../../../../README.md) › `extensions/scylla-base` › `shared/` ·
> [agent guide](./AGENTS.md) · [architecture](../../../../docs/architecture.md)

What the Scylla features share and what has a meaning only for Scylla: the Result type of the
backend calls, the presentation of a run status, the instructions to start an agent, how a
person shows, and the account rules checked before a call.

The generic parts — tables, forms, dialogs, the primitives — are in
[`@scylla/ui`](../../../../packages/ui/README.md). This folder holds what fails the test of that
package, *"could this live in another product, unchanged?"*, but is still used by two features.

## `ScyllaResult<T>` — errors as values

Async operations in Scylla do not throw. They return `ScyllaResult<T>`: data sources wrap their
calls in `tryAsync`, so a gRPC failure becomes a `ScyllaError` with the status code and a
user-facing message. At the presentation boundary, query and mutation options call `.unwrap()`
inside `queryFn` / `mutationFn`, so that TanStack Query owns the error state. The `onQueryError`
of the [shell](../shell/README.md) shows the one toast.

`ScyllaResult` is also the contract of other extensions that call the Scylla backend:
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
