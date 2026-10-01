# Login

> [Scylla frontend](../../../../../README.md) › `features/` › **login** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

The sign-in screen, and nothing else. This is the smallest feature in the codebase: one route,
one repository method, one view model, two components — and the first one migrated to Svelte,
which is why `refacto_svelte.md` uses it as the yardstick for the recipe.

## The session, end to end

Signing in touches three modules, and it helps to see the whole path at once:

1. `LoginForm` collects a username and password and calls `LoginState.submit`.
2. `LoginState` runs the mutation against `LoginRepository.login()`.
3. The gRPC data source calls the backend and, on success, calls `openSession(token, userId)`,
   which writes them into `localStorage`.
4. Every later request picks the token up: the transport in
   [platform/grpc](../../platform/grpc/README.md) reads `localStorage.token` and attaches
   `Authorization: Bearer …` to each call.
5. `AuthGuard` in [shell](../../shell/README.md) reads the same key to decide whether a protected
   route renders or redirects back to `/login`.

Notice that the repository returns `ScyllaResult<void>`. The token deliberately never travels
back up through the domain — the data source persists it as a side effect, and everything
downstream reads it from one place. The upside is that no component ever holds a credential; the
cost is that the `localStorage` key is a contract shared by three modules, so changing it means
changing all three together.

Permissions are **not** loaded here. A freshly signed-in user has an empty permission store
until [roles](../roles/README.md)'s `syncMyPermissions` fills it — that call needs a repository
and a session, so it happens inside the authenticated shell rather than at sign-in.

## Letting another extension change this page

A SaaS build (`scylla-cloud`) wants its own flavour of this page: "Email" instead of "Username",
a link to its own `/register`. Forking the page would mean every later fix to `Login.page.svelte`
has to land twice. Instead, `presentation/login.points.ts` opens a handful of **extension
points** — a zone below the card, the page's texts, the credentials form's fields — as plain
typed values, exported from this feature's barrel like everything else public here. Another
extension imports them from `@scylla/base-sdk` and changes them with a **widget injection**,
declared on its own `@Extension`, not on a module of its own (what it changes belongs to no
module it owns). `openSession` exists for the same reason, one level down: a sign-up flow needs
to open a session exactly the way sign-in does, without a second place that knows the
`localStorage` keys. See `widgets_plan.md` at the repo root for the full mechanism, and
`AGENTS.md`'s "Extension points" for the exact points this page opens.

## Why it is a module at all

A one-method feature could arguably live in `shell/`. It stays a module because the composition
root should not know how authentication works — it should only know that *some* module claims
the `/login` route. `LoginModule` declares it under the `public` mount, which grafts it outside the auth
guard, and the router is derived from that. If sign-in ever grows an SSO flow, a password reset
or a second factor, it grows here without touching the shell.

## Structure

There is no `entities/` or `structs/` folder, and no mapper. There is nothing to model: the
request is two strings and the response is a token that never becomes a domain object. This is
the "minimalism inside the layers" rule in practice — the four-layer split is mandatory, but an
empty folder to look symmetrical is not.

## Related modules

- [platform/grpc](../../platform/grpc/README.md) — reads the token on every request.
- [shell](../../shell/README.md) — `AuthGuard` and the public/protected route split.
- [roles](../roles/README.md) — loads the user's effective permissions after sign-in.
- [user](../user/README.md) — the account behind the credentials.
