# `scylla-cloud`

> [Scylla frontend](../../README.md) › `extensions/scylla-cloud` ·
> [agent guide](./AGENTS.md) · [architecture](../../docs/architecture.md)

**The SaaS build of Scylla, as an extension of `scylla-base` — nothing more, nothing forked.**
Self-hosted Scylla ships `scylla-base` alone; the hosted product adds `scylla-cloud` to the same
build. v1 is self-service sign-up: `scylla-cloud-v1_plan.md` at the repo root is the plan this
extension was built from, and it stays the record of what v1 does and does not cover.

[`@scylla/core`](../../packages/core/README.md) loads this extension exactly like `scylla-base`
— the core has never heard of either. `scylla-cloud` depends on `scylla-base`
(`dependencies: ['scylla-base']`) and reaches it only through
[`@scylla/base-sdk`](../../sdks/scylla-base-sdk/README.md).

## What is inside

```
src/
  scylla-cloud.extension.ts   the @Extension declaration
  features/auth/              the one feature: sign-up
  generated/                   gRPC clients made from the .proto files (never edit)
```

| Layer | Contents |
|-------|----------|
| [`features/auth`](src/features/auth/README.md) | The `/register` page, its gRPC call, and the two widget injections that change the login page. |

## Why a widget injection, not a fork

Forking `Login.page.svelte` to say "Email" instead of "Username" would mean every later fix to
the real page has to be ported by hand, forever. Instead, `scylla-base`'s login page opens a
handful of **extension points** — plain typed values exported from its own barrel, not a global
registry — and this extension changes them with two **widget injections**, declared on its own
`@Extension`:

```typescript
@Extension({
  id: 'scylla-cloud',
  dependencies: ['scylla-base'],
  modules: [CloudAuthModule],
  widgetInjections: { EmailLoginWidgetInjection, SignUpLinkWidgetInjection },
})
export class ScyllaCloudExtension {}
```

- **`EmailLoginWidgetInjection`** overrides the login page's texts ("Username" → "Email") and
  patches its form fields (the identifier field becomes an `email` input) — one injection,
  because the two must change together or neither makes sense.
- **`SignUpLinkWidgetInjection`** adds a "Don't have an account? Sign up" link below the login
  card, through a zone the login page opens for exactly this.

`widgets_plan.md` at the repo root is the full design: why points are plain values and not a
`declare module` augmentation, how a conflict between two injections fails at start-up instead
of on the page, and the trust model (an injection runs with the same rights as the code it
changes — this build compiles every extension together, there is no plugin loaded at runtime).

## The session, after sign-up

Today's login writes `token` and `userId` into `localStorage` as a side effect of a successful
call; three places read them (the gRPC transport, the auth guard, this is covered in the login
feature's own docs). A sign-up needs to open the exact same session, without becoming a fourth
place that knows the storage keys — so the registration data source calls `openSession`,
exported by `scylla-base`'s login feature for this reason, instead of touching `localStorage`
itself.

## Related modules

- [`scylla-base`](../scylla-base/README.md) — the extension this one changes and depends on.
- [`features/login`](../scylla-base/src/features/login/README.md) — the page this extension's
  widget injections change, and the owner of `openSession`.
- [`@scylla/base-sdk`](../../sdks/scylla-base-sdk/README.md) — the only door into `scylla-base`.
