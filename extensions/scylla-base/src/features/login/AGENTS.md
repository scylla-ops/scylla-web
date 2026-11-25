# `features/login` — agent guide

Sign-in, sign-out and the password reset by link. Owns the session and the public pages that
come before it.

**Layer** `features/` · **id** `login` · **DI key** `loginRepository`

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.
- Outside code reaches this module **only** through `index.ts`.

## Public API — `index.ts`

```typescript
LoginState, type Credentials         // Credentials = { identifier, password }
loginPoints, type LoginZoneContext   // extension points — see below
openSession, closeSession            // the only writers of the session; a sign-up flow in another extension uses openSession too
hasSession                           // is a token stored? the auth guard and other extensions read it, never localStorage
signOut                              // closeSession + context reset + the local keys of the account + a full load of /login
loginPath(returnTo)                  // '/login#next=...': the sign-in page, then back to returnTo
loginPathBackTo(location)            // loginPath of the current page; '/login' on /login itself
type PasswordResetDelivery           // 'mail' | 'server-log' | 'unknown'; `user` uses it too
loginQueries.terms()                 // the terms of the user of the session (GetMe): the auth guard and `user` read it
TERMS_STATUS_QUERY_KEY               // ['me', 'terms']
loadTermsStep                        // loader of the full-page terms step (props `status`, `onDecline`); the auth guard shows it
type TermsStatus, TermsAcceptance
arrival                              // the motion after a sign-in: ShellBrand hides its logo with it and gives it the target
```

Never add: `login.module.ts`, a page. A state calls `getModuleDomain('login')` directly.

## A link that starts a provider

Each link to `providerStartUrl` has `rel="external"`: the server serves this path, and the router
takes a link of the same origin that does not have this value. This is also true for the link in
`SignInMethods` of `features/user`.

A link that starts a sign-in (not a link to the account) also calls `arrival.leave` at the click:
see "The arrival after a sign-in".

## A failed sign-in with a provider

The server sends the browser to `/sign-in-error?code=<code>&provider=<slug>`, with `&link=true`
for a link. The page shows one card for each code of
`presentation/presenters/sign-in-error.presenter.ts`, and the general card for any other value.

- Show no text of the URL: the code is a key of the list, and the name of the provider comes from
  `ListSignInMethods`. Anyone can make this URL.
- A failed sign-in is not a lost session: this page does not call `closeSession`. The list of the
  providers has `showsOwnError`, so a network failure gives no toast and the card stays.

## A link that waits for the password

The callback of a provider gives a verified email that an account with a password has. The API keeps
a link for 10 minutes, with its token in an HttpOnly cookie, and the browser goes to `/sign-in-link`.
The URL holds no data: the page reads the link with `GetPendingLink`.

- A failure of the network is not a lost link: the page offers to try again, and only an answer of
  the server gives the card of an expired request.
- A wrong password stays in the page, and the link still waits. It is `FAILED_PRECONDITION`, so the
  global handler does not end a session.
- At the end the page does a full load of `returnTo`: the session is in its cookie.

## Data contract

`LoginRepository` — `domain/repository/login.repository.ts`:

| Method | Returns |
|---|---|
| `login(identifier, password)` | `void` |
| `requestPasswordReset(email)` | `PasswordResetDelivery` |
| `resetPassword(token, newPassword)` | `void` |
| `signUp(input)` | `void`; `input.acceptedTermsVersion` is the version that the person accepted |
| `verifyEmail(token)` | `void`; FAILED_PRECONDITION: the link is unknown, used or expired |
| `resendVerificationEmail(email)` | `void`; the same answer for each email; RESOURCE_EXHAUSTED: too many requests |
| `listSignInMethods()` | `SignInMethods`: the providers, the sign-up mode and `mailSender` |
| `termsStatus()` | `TermsStatus` (`GetMe`) |
| `acceptTerms(version)` | `TermsAcceptance` |

**`void` on `login` is not an oversight.** The session token never travels back through the
domain: `DefaultLoginRepository` calls `openSession` as a side effect of a successful call. Do not
"improve" this by returning the token: read the rule below before changing anything here.

`identifier` is the name of the value at every layer, from the form field to the request: an
email when it holds '@', else a username.

## Layout

```
login.module.ts                      routes + DI wiring (private; registry only)
index.ts                             public API
domain/
  repository/login.repository.ts
  structs/password-reset-delivery.struct.ts   PasswordResetDelivery
infrastructure/
  default-login.repository.ts           AuthServiceClient; calls openSession
  grpc-password-reset.mapper.ts         proto enum → PasswordResetDelivery
  session.ts                            openSession, closeSession (the writers of token + userId), hasSession
  account-storage.ts                    forgetAccountStorage: the local keys of the account, removed at the sign-out
presentation/
  login.commands.ts                  "Sign out...", for the search bar
  login.points.ts                    the extension points — see below
  sign-out.ts                        signOut
  mappers/return-path.mapper.ts      loginPath, loginPathBackTo, safeReturnPath, returnPathOf
  messages/                          login, password-reset
  ui/login.state.svelte.ts           sign-in: the mutation, the dots of the mark, the start of the arrival
  ui/ArrivalOverlay/ArrivalOverlay.svelte   over each page (appOverlays): the curtain and the landing
    arrival.state.svelte.ts                 arrival: the phases and their times, the wait for the app,
                                            the marker of a sign-in with a provider
    arrival.attachments.svelte.ts           the Web Animations of the curtain, the flight and the page
  ui/Login/Login.page.svelte, ui/LoginForm/LoginForm.svelte
  ui/ForgotPassword/ForgotPassword.page.svelte
    forgot-password.state.svelte.ts  the request of a reset link
  ui/ResetPassword/ResetPassword.page.svelte
    reset-password.state.svelte.ts   the token of the link, the new password
  ui/SignUp/SignUp.page.svelte, ui/VerifyEmail/VerifyEmail.page.svelte
  ui/ResendVerification/ResendVerification.svelte   the sender of the mails, "Send the link again"
    resend-verification.state.svelte.ts             the sender (ListSignInMethods), the request
  messages/verification.messages.ts        the texts of a new link to verify an email
  mappers/sign-in-outcome.mapper.ts        EMAIL_NOT_VERIFIED of a sign-in as data
  mappers/resend-outcome.mapper.ts         RESOURCE_EXHAUSTED of a new link as data
  messages/login.messages.ts               the sign-in strings (the `login.texts` point)
  messages/password-reset.messages.ts      the strings of the two reset pages
  messages/terms.messages.ts               the box, the notice and the terms step
  mappers/terms-refusal.mapper.ts          TERMS_NOT_ACCEPTED as data: the current version
  presenters/linked-text.presenter.ts      link slots in a translated sentence, termsLinks
  presenters/terms.presenter.ts            the texts of the step and of a refusal, changeItems
  ui/LinkedText/, ui/TermsCheckbox/        a sentence with links; the box of the terms
  ui/TermsStep/TermsStep.svelte            the full-page step (loadTermsStep)
    terms-step.state.svelte.ts             the legal settings, the box, AcceptTerms
```

## Extension points

Full mechanism: `sdks/core-sdk/AGENTS.md`, "Widgets". Defined in
`presentation/login.points.ts`, listed in `LoginModule.points` (that names them `login.*`),
exported from this barrel and from `@scylla/base-sdk`.

| Point | Kind | Context / type | Notes |
|---|---|---|---|
| `login.footer` | zone | `LoginZoneContext` (`{ isPending }`) | Below the form, opened with `<WidgetZone point={loginPoints.footer} context={{ isPending }} />`. No default content: a zone that only ever receives `after` components. **No `permission`** — the user has none yet on this page; see the rule below. |
| `login.texts` | text scope | `typeof loginMessages` | `title`, `description`, `identifier`, `identifierPlaceholder`, `password`, `passwordPlaceholder`, `submit`, `forgotPassword`. The page renders them with `t(loginMessages.x)`, as usual: `t` applies the overrides. Render the descriptor of `loginMessages` itself: a copy (`{ ...loginMessages.title }`) is a different object, and an override would not reach it. |
| `login.fields` | value | `readonly FormItem<'identifier' \| 'password'>[]` | The `ScyllaForm` fields of `LoginForm.svelte`. Keep the ids: `submit` reads `values.identifier` and `values.password`. |

- **The field id is `identifier`, not `username`.** The backend's `LoginRequest.identifier`
  accepts a username or an email; an extension that wants an email field does it with a patch on
  `login.fields`, not a new field.
- **Override the label, the placeholder and the description together.** The default texts say
  "Email or username" in three places. An override of `identifier` alone leaves a description
  that names a username the field no longer takes.
- **The "Forgot password?" link is CE content**, in the footer snippet of `LoginForm`, right under
  the password field. It is not in the `login.footer` zone, which stays empty for the extensions.
- **No `login.form` zone yet.** It would wrap the whole credentials form (for a `replace`, e.g.
  a different sign-in method entirely). Add it when a real consumer needs it, not before.

## Routes & nav

| Mount | Path | Permission | Component |
|---|---|---|---|
| `public` | `login` | none | `Login.page.svelte` |
| `public` | `forgot-password` | none | `ForgotPassword.page.svelte` |
| `public` | `reset-password` | none | `ResetPassword.page.svelte` |

The `public` mount puts them **outside** `AuthGuard`. They must stay there: mounting them
anywhere else makes signing in, or resetting a password, require being signed in.

The frame of these pages is `@shared/presentation/ui/layout/AuthLayout.svelte`. The page of an
invitation uses it too.

`reset-password` is the path of the link that the server makes
(`AuthService.RequestPasswordReset`). Do not rename it.

No nav entry — the sidebar only renders inside the authenticated shell.

## The arrival after a sign-in

Motion A of the design "Sign-in to dashboard arrival animation". It plays after a sign-in with the
form, and after a sign-in with a provider (see below). A reload opens the app with no motion.

1. Submit: the four dots of the mark in the panel (`LogoMark` of `shared`) go grey and turn
   (`waiting`). A refusal stops the turn on the next quarter turn and the dots go back to `idle`.
2. The answer of the server: the dots light clockwise (`lit`), and `arrival.begin(go)` starts.
3. At 450 ms the panel closes over the form like a curtain (`cover`, 550 ms). The form fades and
   moves right (`leaving` of `AuthLayout`).
4. At 1000 ms the page calls `go`: the router opens the app under the overlay (`stage`). The stage
   holds until the router shows a `main` and no query runs for 100 ms: 150 ms at least, 3 s at most.
5. `landing` (600 ms): the mark flies onto the mark of the logo of the shell, the panel fades out,
   the page settles from a scale of 1.03, and the widgets come up row by row.
6. `arrived` (300 ms): the logo of the shell shows again, then the overlay goes.

- **Below `lg`, or with reduced motion, there is no curtain** (`mode` `fade`): a veil fades in for
  200 ms, the app opens under it, and the veil fades out for 200 ms.
- **The overlay is a shell contribution of this module** (`appOverlays`): the core renders it after
  the router, so it stays on the screen when the route changes, and the page is before it in the
  DOM.
- **The mark lands on the `logo_lockup.svg` images of `ShellBrand`**: they register with
  `arrival.target`. `LOCKUP` in `arrival.attachments.svelte.ts` holds the place of the mark in this
  image. Change it when the image changes.
- **The flight reads the box of the mark and the box of the logo before any motion starts, and the
  view hides its scrollbars while the page settles.** At a scale of 1.03 the page is larger than
  the view. A scrollbar makes the overlay smaller and moves its center: the mark then lands off the
  logo by half the width of the scrollbar.
- **The view of the sign-in page has a scrollbar gutter, and the shell has none.** The gutter goes
  when the shell opens, while the panel covers the view: the curtain moves the mark in px of the
  view at its start, so the mark does not move. After a sign-in with a provider, the frame of the
  sign-in page (`arrival-back`) keeps the gutter while it shows (the style of `ArrivalOverlay`).
- **The times are the times of the spec frame of the design** (`ARRIVAL_MS`). A test with fake timers
  calls `arrival.reset()` after each test: `arrival` is one object for the app.

### After a sign-in with a provider

The sign-in with a provider is a full page load to the provider, then a full page load of the return
path. The tab keeps the arrival across the two loads with a marker in its session storage
(`scylla.sign-in-arrival`, in the tracker registry): the time of the click and the return path.

1. The click on a provider (`SignInProviders`, or "Try again" of `SignInError`) calls
   `arrival.leave`: it writes the marker, and the dots wait until the tab leaves. A click with a
   modifier opens another tab: it changes nothing.
2. At the start of the app, `ArrivalOverlay` calls `arrival.comeBack`. It reads the marker one time
   and removes it. The arrival plays only when the tab is on the return path of the marker, and the
   marker is 10 minutes old at most (the life of a sign-in with a provider on the server).
3. `back` (200 ms): from the first frame, the frame of the sign-in page, with no column, hides the
   app that starts (`hidesApp`). Then the dots light, and the arrival goes on as after the form. At
   the stage, the app is already under the panel: there is nothing to open.
4. Below `lg`, or with reduced motion, the veil is there from the first frame, with no fade in.

- **A failed sign-in plays nothing.** The server sends the tab to `/sign-in-error` or to
  `/sign-in-link`, and the back button to `/login`: these are not the return path, and the marker
  goes at the start. When the browser shows the sign-in page from its back-forward cache, the page
  does not start again: `pageshow` stops the wait of the dots and removes the marker.

## The return path

A page that needs a session sends a signed-out user to `loginPath(returnTo)`, for example the
invitation page of an extension: `navigateTo(loginPath('/invite#token=...'))`. After the
sign-in, the login page goes to `returnTo` with `replace`, else to `/`.

- **The return path is in the fragment of the login URL** (`/login#next=<encoded path>`), not in
  the query. It can hold a token, and a fragment never goes to the server, to an access log or
  into a `Referer`. The fragment of the return path itself is kept.
- **Only a path of this app is accepted** (`safeReturnPath`): it starts with one `/`, it has no
  backslash and no control character, and it resolves on the same origin. `//host`, `/\host`,
  `https:`, `javascript:` and `data:` give `null`, and the page then goes to `/`. Do not read
  `next` without this check: that is an open redirect.
- The login page reads the fragment when the sign-in succeeds, and it does not remove it: a reload
  of the page keeps the return path.
- `loginPathBackTo({ pathname, search, hash })` is `loginPath` of the current page. On `/login`
  itself it gives `/login`, so a sign-out on the login page does not loop. For a path that
  `safeReturnPath` refuses, it also gives `/login`. The shell's `reportQueryError` uses it on
  `UNAUTHENTICATED`.

## The password reset

- `forgot-password` calls `RequestPasswordReset`. The answer is the same whether an account uses
  the email or not; the page tells only how the server delivers the link (`delivery`): by mail,
  or in the server log for an administrator.
- `reset-password` reads the token from the URL fragment (`#token=…`) when the view model is
  built, and again on `hashchange` (`readNewLink`): a second link opened in the same tab changes
  only the fragment, with no page load. Each time it removes the fragment with
  `history.replaceState` and starts again from an empty form. The token never reaches the
  server in a request line, and it does not stay in the address bar or the history.
- FAILED_PRECONDITION of `ResetPassword` (unknown, used or expired link, inactive account) is a
  state of the page, not an error: `refusalOf` (`@shared/utils/scylla-error.ts`) gives it back as
  data, so the global handler does not toast it too. A link with no token shows the same state.
- The new password is checked in the app first (`@shared/utils/account-validation.ts`): 8 to 255
  characters, and a confirmation equal to it.

## The check of the email

A sign-up with a password makes an account that waits for the check of its email. The server
sends a link to `/verify-email#token=…`. A person who does not get the mail is never stuck:

- **Each screen that waits for the mail has `ResendVerification`**: the sign-up page after the
  submit (not after the sign-up of an invitation, which verifies the email), the sign-in page
  after EMAIL_NOT_VERIFIED, and the verify page with an expired or used link. It names the sender
  of the mails (`mailSender` of `ListSignInMethods`) and the spam folder, and its button calls
  `ResendVerificationEmail`. Without an `email` prop, it asks for the email.
- **The answer is the same for each email.** The text after a request with a typed email does not
  tell whether an account uses it.
- **EMAIL_NOT_VERIFIED of a sign-in is a state of the page**, not a toast (`signInOutcomeOf`): the
  form stays, and the box above it sends the link to the identifier of the sign-in.
- **RESOURCE_EXHAUSTED of a new link is a state of the component** (`resendOutcomeOf`), so its
  text is in the language of the page.
- A new sign-up with the email of an account that waits for its check also sends a new link: the
  server does not change the account.

## Rules that bite here

- **Session storage is `localStorage`, keys `token` and `userId`, written only by
  `infrastructure/session.ts`.** Three places must agree: `openSession` writes them,
  `platform/grpc`'s transport reads `token` for the `Authorization: Bearer` header, and
  `shell/.../Auth.guard.svelte` reads it (through `hasSession`) to decide whether to redirect. Changing the key or the
  mechanism means changing all three in the same commit. **A sign-up flow (in another extension)
  opens a session the same way — through `openSession`, never a direct `localStorage.setItem`.**
  Signing out goes through `closeSession` (both keys) or `signOut`.
- **The sign-out removes the local keys of the account** (`infrastructure/account-storage.ts`): the
  context, the bookkeeping of the user state, the onboarding, the dashboards, the command history,
  the seen flags of the release and the style of the nodes. The theme, the language and the width
  of the sidebar stay: they are choices for the device. A new local key that holds data of the
  account adds its name or its prefix to this file, in the same commit.
- **A view model of this module must be constructed during a component's initialisation.** The
  mutation inside it installs an `$effect.pre`; built from an event handler, Svelte throws
  `effect_orphan`. True of every view model holding a query or a mutation.
- No permission gate anywhere in this module — the user has none yet. Permissions are loaded
  *after* sign-in by `syncMyPermissions` in [`roles`](../roles/AGENTS.md), which the shell calls.
  **The same reason bars `permission` on a `login.footer` injection** (`can` has nothing to
  check pre-sign-in; see "Extension points" above) — a contributor that sets one gets a
  component that silently never renders, not an error.
- After a successful login the app must land somewhere the user can actually reach; that
  redirect is the shell's job, not this module's.
- Never log, toast or store a password. Errors surface as a generic failure: do not leak
  whether the account exists.
- **The repository re-codes `UNAUTHENTICATED` to `INVALID_CREDENTIALS`** (it catches the error and throws a new `ScyllaError`). On
  every other call that code means "session expired", and the shell's `reportQueryError`
  handler reacts to it by clearing the session and hard-loading `/login`. From the login page
  that is a silent reload that eats the error. Remove the translation and a wrong password
  reloads the page instead of showing a message.

## The terms of service

The terms to accept come from `termsToAccept` of `@platform/legal`: the document `terms` when it
is on and needs an acceptance (fix 1, `GetLegalInfo`). There is no other source. With
`undefined`, the pages show no box, no notice and no step.

- **The sign-up form** shows an unticked box "I accept the Terms of service", and the submit
  stays disabled until the box is ticked. It sends the version that the person saw
  (`acceptedTermsVersion`). The note under the button links the privacy policy when it is on.
- **A refusal is a state of the page.** `TERMS_NOT_ACCEPTED` (the terms changed) comes back as
  data with `termsRefusalOf`: the box is unticked, the text under it names the version of the
  ErrorInfo metadata, and the legal settings are read again. A tick removes the text.
- **The provider buttons** of the sign-in page have a notice under them: a first sign-in with a
  provider makes an account, and the terms step then asks the acceptance.
- **The terms step** is a full page in `AuthGuard` (`shell/`), before the app: `loginQueries.terms`
  gives `acceptanceRequired`. A first acceptance shows the account of the session. A new version
  shows its version, its date of effect and the list "What changes": one item for each line of
  `changes` of the terms, with no list mark (`changeItems`). An empty `changes` shows no list. The
  step reads the legal settings again
  (`staleTime: 0`): the version that it sends must be the current one. The server refuses no
  other route to a user who did not accept: an error of the read of `GetMe` shows the app.
- **A person who refuses the terms can leave.** The step has "Sign out" and, last, "Decline and
  delete my account" (`onDecline`). The auth guard opens the deletion of `features/user`
  (`loadAccountDeletion`): its password, its refusals (for example the last owner of a
  workspace) and the sign-out after the deletion. `DeleteAccount` needs no acceptance. This
  module cannot import `user` (`user` imports `login`): the shell joins them.
- **A legal link in a sentence opens in a new tab** (`LinkedText`): the form and the step keep
  their state. Write the sentence with one value for each link (`linkSlot('terms')`), so that a
  translation can put the link at another place.
- No marketing opt-in here.

## Before done

`pnpm typecheck && pnpm lint && pnpm depcruise && pnpm depcruise:cycles && pnpm i18n:collisions`
— all clean.
New strings: `pnpm extract && pnpm compile`.
