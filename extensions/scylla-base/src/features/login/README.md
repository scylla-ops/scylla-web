# Login

> [Scylla frontend](../../../../../README.md) › `features/` › **login** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

The pages that come before a session, and the session itself: sign-in, sign-out, and the
password reset by link. It was the first feature migrated to Svelte, which is why
`refacto_svelte.md` uses it as the yardstick for the recipe.

## The session, end to end

Signing in touches three modules, and it helps to see the whole path at once:

1. `LoginForm` collects an identifier (an email or a username) and a password, and calls
   `LoginState.submit`.
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

Signing out is the reverse, and it is here for the same reason: `closeSession` removes both
keys, and `signOut` also clears the context store and loads `/login` again. The menu of the shell
and the deletion of the own account in [user](../user/README.md) both call `signOut`, so no
second place knows the keys.

Permissions are **not** loaded here. A freshly signed-in user has an empty permission store
until [roles](../roles/README.md)'s `syncMyPermissions` fills it — that call needs a repository
and a session, so it happens inside the authenticated shell rather than at sign-in.

## The password reset

A user who forgot the password asks for a link on `/forgot-password`. The server answers the
same way whether an account uses the email or not, so the page cannot tell an attacker which
emails exist; it tells only how the server delivers its links: by mail, or in its log, where an
administrator finds the link and passes it on.

The link opens `/reset-password` with the token in the URL fragment. A fragment never goes to
the server in a request, and the page removes it from the address bar as soon as it reads it.
A link that is unknown, used or expired gives one message, with a way to ask for a new link: the
server does not say which case it is, and the page does not guess.

## Letting another extension change this page

A SaaS build wants its own flavour of the sign-in page: "Email" instead of "Email or username",
a link to its own `/register`. Forking the page would mean every later fix to `Login.page.svelte`
has to land twice. Instead, `presentation/login.points.ts` opens a handful of **extension
points** — a zone below the card, the page's texts, the credentials form's fields — as plain
typed values, exported from this feature's barrel like everything else public here. Another
extension imports them from `@scylla/base-sdk` and changes them with a **widget injection**,
declared on its own `@Extension`, not on a module of its own (what it changes belongs to no
module it owns). An extension that changes the label of the identifier also changes its
placeholder and the description of the card: all three name what the field takes.
`openSession` exists for the same reason, one level down: a sign-up flow needs
to open a session exactly the way sign-in does, without a second place that knows the
`localStorage` keys. See `widgets_plan.md` at the repo root for the full mechanism, and
`AGENTS.md`'s "Extension points" for the exact points this page opens.

## Why it is a module at all

The composition root should not know how authentication works. It should only know that
*some* module claims the public routes. `LoginModule` declares them under the `public` mount,
which grafts them outside the auth guard, and the router is derived from that. The password
reset grew here without a change to the shell; an SSO flow or a second factor would too.

## Structure

The domain is small: the repository and one struct, `PasswordResetDelivery`, which
[user](../user/README.md) reads too (an administrator sends a reset link from there). Its only
mapper turns the proto enum into that struct. The three public pages share one frame,
`AuthLayout`: the logo, a card, and a place below the card for the zone of the sign-in page.

## Related modules

- [platform/grpc](../../platform/grpc/README.md) — reads the token on every request.
- [shell](../../shell/README.md) — `AuthGuard` and the public/protected route split.
- [roles](../roles/README.md) — loads the user's effective permissions after sign-in.
- [user](../user/README.md) — the account behind the credentials.
