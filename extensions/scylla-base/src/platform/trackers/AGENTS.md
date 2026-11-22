# `platform/trackers` — agent guide

The tracker registry: each cookie and each key of the browser storage (`localStorage`,
`sessionStorage`) that the app reads or writes, with its purpose, its lifetime and whether it is
exempt from consent. The cookie page (`/legal/cookies`) and the admin page "Legal and privacy"
show it.

**Layer** `platform/` · alias `@platform/trackers`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- Consumers import `@platform/trackers`: the barrel, never a deep path. Other extensions import
  it from `@scylla/base-sdk`.

## Public API — `index.ts`

```typescript
type Tracker, TrackerType, TrackerNeedingConsent
CONSENT_PURPOSES, type ConsentPurpose   analytics, marketing, support: the rows of the cookie settings
SCYLLA_TRACKERS                 the trackers of scylla-web and of the server
trackersPoints.trackers         value point `legal.trackers`: another extension adds its trackers
registeredTrackers()            SCYLLA_TRACKERS, then the patches of the extensions
trackersNeedingConsent, consentBannerNeeded, purposesNeedingConsent, fixedNamePart
trackerTypes, trackersMessages, consentPurposeTitles, consentPurposeDescriptions
TrackerTable                    Svelte: name, type, provider, purpose, lifetime, status
```

## The rule: no cookie or storage key without a registry entry

- **A new cookie or a new storage key gets an entry in the same change**, with its owner (the
  file that writes it, from the folder of the repositories), its purpose, its lifetime and
  `exempt`. Scylla code: `presentation/ui/trackers.registry.ts`. Another extension: a patch of
  `trackersPoints.trackers`.
- **`exempt: true` only for a tracker that is strictly necessary** for the service that the user
  asked for: the session, the security of the sign-in, an interface choice of the user. Analytics,
  a session replay, a marketing pixel, a chat widget that sets cookies: `exempt: false`.
- **An entry with `exempt: false` names its `consent` purpose** (`CONSENT_PURPOSES`). A new
  purpose is a new value there, with its title and its description in `trackers.messages.ts`.
- **One entry with `exempt: false` turns the consent framework on** (`platform/consent`): the
  banner, the cookie settings and their entries. The admin page shows the state. Load the script
  of such a tracker only through `whenGranted(purpose, load)` of `@platform/consent`.
- **A tracker of another origin also needs the content security policy of the server**
  (scylla-ce, `scylla-core/src/api/web/policy.rs`): the browser blocks each script, image or call
  to an origin that the policy does not name.
- **The cookies of the server have the names of HTTPS**: `__Host-scylla_session`. A local server
  with HTTP sets them with no prefix.
- `__test__/trackers.registry.test.ts` fails when a file uses a cookie or the storage and no
  entry names it as its owner, and when an owner does not name its key. A file that only uses a
  key of another file goes in `USERS` of the test. A file that writes the key of its caller goes in
  `MECHANISMS`.
- A name with a part that changes writes it in angle brackets: `onboarding:<userId>`. The test
  looks for the text before the first bracket in the owner.

## Layout

```
index.ts
domain/structs/tracker.struct.ts            Tracker, the rules of the banner
domain/structs/consent-purpose.struct.ts    CONSENT_PURPOSES
presentation/trackers.points.ts             trackersPoints, registeredTrackers
presentation/messages/trackers.messages.ts
presentation/ui/trackers.registry.ts        SCYLLA_TRACKERS
presentation/ui/TrackerTable/
__test__/trackers.registry.test.ts          the registry and the code stay equal
```

`features/legal` lists `trackersPoints` in its module: the loader names the point
`legal.trackers`.
