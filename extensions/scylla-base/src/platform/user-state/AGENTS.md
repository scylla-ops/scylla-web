# `platform/user-state` — agent guide

The interface state of one person on the server, with `localStorage` as its read copy. The theme,
the language, the node style, the seen flags of the release and the tour stay the same on all
devices of this person.

**Layer** `platform/` · alias `@platform/user-state`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- Consumers import `@platform/user-state`: the barrel, never a deep path.

## Public API — `index.ts`

```typescript
userState                 the shared instance
createUserState(client, storage?)   for a test
type UserState, UserStateDefinition, UserStateKey

userState.define(definition)   declares a key, gives { save(value) }
userState.load(userId)         reads the server one time for this user
userState.whenLoaded()         resolves when the local copies hold the answer, also after a failed read
userState.loadFailed()         the server gave no answer
userState.forget()             removes what this browser holds for a deleted account
```

## What goes in a key

- **A key holds the interface state of one person.** Never a secret, a token or a password: the
  client reads and writes the value as text, and the server does not read it.
- **A value that the server must read moves to a typed field of a proto.** The server cannot validate
  or query a value in this store.
- **The place of a node is not in this store.** It belongs to the pipeline, and all members see it
  (`features/pipeline`, `SavePipelineLayout`).
- The server holds 64 KiB for each user, and refuses a larger write. The write fails with no toast:
  the local copy stays, and the key stays marked.
- A key: 1 to 128 lower case letters, digits, dots, colons, dashes or underscores.

## The keys

| Key | Value | Owner | Merge | Upload |
|---|---|---|---|---|
| `theme` | `light`, `dark`, `system` | `shell/presentation/layout/user-preferences.ts` | no | yes |
| `locale` | `en`, `fr` | `shell/presentation/layout/user-preferences.ts` | no | no |
| `last-workspace` | `{ id }` | `shell/presentation/router/last-workspace.ts` | no | no |
| `whats-new-seen` | `{ version, seen }` | `shell/presentation/layout/whats-new.state.svelte.ts` | union | yes |
| `node-appearance` | a style | `features/pipeline/presentation/node-appearance.user-state.ts` | no | yes |
| `onboarding` | the status | `features/onboarding/infrastructure/default-onboarding.repository.ts` | `mergeStatuses` | yes |

## How to add a key

1. Call `userState.define` at the top level of a file that the entry chunk holds. `load` only knows
   what is defined at that time: a key in a lazy chunk is not read.
2. Give `decode`, which gives `null` for a value that this build cannot read.
3. Give `readLocal` and `writeLocal`. A reader continues to read the local copy.
4. Call `save` after each write to the local copy. It sends nothing when the value did not change.
5. Give `merge` when two devices can add to the value. A key with no merge keeps the last choice.
6. Set `upload: false` when a local value does not prove a choice of the person. Example: the load
   of a page writes the language of the browser into the local key.
7. Add a row to the table above, and a `removeLocal` when the local key has the user id.

## The rules of a page load

`Auth.guard.svelte` calls `load` when the session is valid. The server is read one time. Each key
then goes through this table, with the bookkeeping key `scylla-user-state:<userId>`
(`{ [key]: { version?, dirty? } }`):

| Server | Local state | Result |
|---|---|---|
| no usable value | a local value, marked or `upload` is not `false` | the local value goes to the server |
| a value | known version, no mark | the server value goes to the local copy |
| a value | marked, same version | the local value goes to the server |
| a value | marked, another version | the merge, or the local value with no merge |
| a value | first run, with a merge | the merge |
| a value | first run, with no merge | the server value goes to the local copy |

## Rules that bite here

- **A reader never waits for the network after `whenLoaded`.** Do not add a read of the server to a
  key. The value of another device arrives at the next page load.
- **A dialog that must not show again waits for `whenLoaded`** (`LaunchOverlays`). A new device must
  not show a dialog that this person already closed.
- **A failed read is not a new person.** After a failed read with no local copy, the onboarding
  repository rejects, so the welcome does not show. Use `loadFailed` for this.
- **One write at a time for each key**, with only the last waiting value. A key with a merge sends
  `expectedVersion`. On `ABORTED` it reads again, merges and tries again, 3 attempts at most.
- **`online` starts the sync again**: a new read after a failed read, else the marked keys.
- **A failed write shows no toast.** It stays marked for the next page load. The person keeps the
  choice on this device.
- `saveLayout` of the pipeline does not use this store, and this store does not use TanStack Query:
  the values are local copies, not data of a page.

## Files

```
index.ts                  the barrel and the shared instance
user-state.ts             createUserState
__test__/user-state.test.ts
```

## Before done

`pnpm typecheck && pnpm test && pnpm lint && pnpm depcruise && pnpm depcruise:cycles`, and
`e2e/user-state.e2e.ts` against a real CE server for a change of the sync rules.
