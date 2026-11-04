# Onboarding

> [Scylla frontend](../../../../../README.md) › `features/` › **onboarding** ·
> [agent guide](./AGENTS.md) · [architecture](../../../../../docs/architecture.md)

A new user lands on an empty dashboard. The tour takes them to a first green run: create an
agent, start it, create a project and a pipeline, run it, open the job. The design is the
"Onboarding" page of the Scylla Figma file.

## The shape of the tour

A welcome dialog, 21 steps that point at the page, and a final dialog. A card with a spotlight
points at one element; a thin dotted line joins them. The user does the real action (a click, a
form) and the tour follows: there is no fake data and no shortcut. Steps that only explain
something have a Next button. "Skip tour" asks for a confirmation, because a skipped step breaks
the ones after it.

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

- [shell](../../shell/README.md) — mounts the tour after the release announcement.
- [agents](../agents/README.md), [project](../project/README.md),
  [pipeline](../pipeline/README.md), [jobs](../jobs/README.md) — the pages the tour points at.
