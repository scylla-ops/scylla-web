# `platform/consent` — agent guide

The consent to the trackers that need it: the banner, the cookie settings, their entries, the
cookie `scylla_consent`, the records on the server (`scylla.platform.v1.ConsentService`), and the
loaders that wait for a yes. **Hidden while each tracker of the registry is exempt**: no banner,
no entry, no read of the cookie.

**Layer** `platform/` · alias `@platform/consent` · other extensions: `@scylla/base-sdk`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- It imports `@platform/trackers` (the registry), `@platform/grpc` and `@shared`. It never imports
  `@platform/legal`: `LegalFooter` imports this module. The host of the overlay
  (`shell/…/ConsentHost`) reads the cookie policy and gives it as a prop.

## Public API — `index.ts`

```typescript
consentFrame(trackers?)         { on, version, purposes, trackers }: `on` while one tracker needs consent
cookieSettings                  the one dialog: open(source), close(), openFrom (global, see below)
consentMessages                 cookieSettings: the label of each entry
whenGranted(purpose, load)      runs `load` once the person accepts the purpose; never with GPC
consentQueries.state()          the choice of this browser and its Global Privacy Control
consentMutations.save()         public: RecordConsent (with the user of the session, if one)
CONSENT_STATE_QUERY_KEY
bannerNeeded, choiceHolds, grantedPurposes, consentAction, consentVersion, CHOICE_LIFETIME_DAYS
type ConsentChoice, ConsentGrants, ConsentState, ConsentAction, ConsentSource, RecordConsentInput
type ConsentFrame, ConsentPurposeRow, PolicyLink, ConsentRepository
loadConsentOverlay()            loader of the banner and the dialog: the shell renders it once
withConsentRepository(repo)     for a test: replaces the repository, gives the restore function
```

## The rules

- **An entry shows only while `consentFrame().on`.** The footer (`LegalFooter`), the user menu
  (`NavUser`) and the account page (Privacy) check it. A new entry checks it too.
- **A tracker that needs consent loads only through `whenGranted(purpose, load)`.** Never a
  `<script>` in `index.html`, never an import at start. Its registry entry has `exempt: false`
  and its `consent` purpose (`CONSENT_PURPOSES` of `@platform/trackers`).
- **Off by default.** No choice, an old choice (6 months, `CHOICE_LIFETIME_DAYS`) or a choice of
  another version of the trackers (`consentVersion`) accepts nothing, and the banner asks.
- **Global Privacy Control is a refusal of each purpose.** No banner, no loader; the dialog
  says why and its controls stay off.
- **The three buttons have the same weight**: same variant, same size, same width. A refusal
  is as easy as an acceptance.
- **A withdrawal is a new record** of the same consent id. The cookies and the storage keys of
  the refused purposes go (`ConsentRepository.forget`); a script that ran stays until a reload,
  so the page loads again.
- **The server keeps the proof**: the consent id, the version, the SHA-256 of the text that the
  person saw (`consentText`), each choice, the action, the source and the time. With a session,
  the record names the user: the account export holds it and the deletion of the account
  deletes it.
- `RecordConsent` is not in `PUBLIC_METHODS`: the transport sends the token of a session when
  there is one, and the call works with no session.
- `cookieSettings` is global state (root `AGENTS.md`, "Global state"): the dialog is in the
  overlay, and its entries are in other modules.
- Write no legal text of a company here. The cookie policy is a document of the operator.

## Layout

```
index.ts
consent-repository.ts                         the repository: made on the first use, or a test fake
domain/structs/consent-choice.struct.ts       the choice, the state, the input, their rules
domain/structs/consent-version.struct.ts      consentVersion: a hash of the trackers that need consent
domain/repository/consent.repository.ts
infrastructure/default-consent.repository.ts  ConsentServiceClient and the cookie → domain
infrastructure/consent-cookie.ts              the cookie `scylla_consent`, the removal of the trackers
infrastructure/grpc-consent.mapper.ts
infrastructure/sha256.ts                      in plain code: no secure context needed
presentation/consent.queries.ts               the state, the save, and its effects
presentation/consent.loaders.ts               whenGranted, applyGrants
presentation/messages/consent.messages.ts
presentation/presenters/consent.presenter.ts  consentFrame, the rows, the text of the proof
presentation/ui/cookie-settings.state.svelte.ts
presentation/ui/ConsentOverlay/               the banner and the dialog, once over each page
presentation/ui/ConsentBanner/                the panel at the bottom, which blocks nothing
presentation/ui/ConsentPreferences/           the dialog: one row for each purpose, with its partners
```

## Before done

`pnpm test:dir extensions/scylla-base/src/platform/consent`, then the gates of the root
`AGENTS.md`.
