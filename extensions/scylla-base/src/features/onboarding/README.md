# Onboarding

> [Scylla frontend](../../../../../README.md) › `features/` › **onboarding** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

A new user lands on an empty dashboard. The welcome dialog shows what Scylla does in 4 key
features, then offers a guided tour. The tours take the user to a first green run: connect an
agent, create a project and a pipeline, run it, open the job. Other tours cover triggers, secrets,
roles and members. The design is the "Onboarding · tutoriel" page of the Scylla Figma file.

## The shape of the tours

One long tour of 19 steps was too long: users skipped it. Each tour now has 6 steps or fewer and
does one job. "Connect an agent" is recommended first, because nothing runs without an agent.
"Help & tours", in the user menu, opens a page that starts any tour again at any time.

A card with a spotlight points at one element; a thin dotted line joins them. The user does the
real action (a click, a form) and the tour follows: there is no fake data and no shortcut. When
the action is a click on a button, the card repeats that button, so the next move is always in the
same corner of the card. Steps that only explain something have a Next button. "Skip" asks for a
confirmation. A dialog at the end of each tour shows the tours that are done and offers the next.

## Why anchors and not selectors

The tour reads the page through `data-tour` / `data-part` attributes on the real elements, and
through the mutation cache for the writes whose result it needs (the new project to point at, the
pipeline it runs). A CSS class changes with the design; an attribute says "the tour depends on
this".

## Why a repository for a flag

The backend does not store the tour progress yet, so it lives in `localStorage`, per user. It is
behind `OnboardingRepository` so that a backend implementation replaces it without a change in
the presentation.

## Related modules

- [shell](../../shell/README.md) — mounts the tour after the release announcement. Its user menu
  opens the help page.
- [apps](../apps/README.md), [project](../project/README.md), [pipeline](../pipeline/README.md),
  [jobs](../jobs/README.md), [triggers](../triggers/README.md), [secret](../secret/README.md),
  roles, [membership](../membership/README.md) — the pages the tours point
  at.
