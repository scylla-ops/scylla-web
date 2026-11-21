# `features/legal` — agent guide

The pages of the legal documents: the public page `/legal/<kind>` of each document, and the admin
page "Legal and privacy" (`/instance/legal`). The data is in
[`platform/legal`](../../platform/legal/AGENTS.md), the trackers in
[`platform/trackers`](../../platform/trackers/AGENTS.md).

**Layer** `features/` · **id** `legal` · **DI key** none · **points** `legal.trackers`
(`trackersPoints`)

## Import rules

- May import: `@platform/*` barrels, `@shared/*`, other features' `index.ts`.
- Must never import: `shell/`, `@scylla/core`, another feature's internals.

## Routes

| Mount      | Path          | Permission                                                   | Page                                      |
| ---------- | ------------- | ------------------------------------------------------------ | ----------------------------------------- |
| `public`   | `legal/:kind` | none                                                         | `LegalDocument.page.svelte`               |
| `instance` | `legal`       | `MANAGE_INSTANCE_SETTINGS` (server: `update_legal_settings`) | `LegalSettings.page.svelte`, nav order 55 |

## The public page

- One frame for each kind: the logo, "Back to Scylla", the language, Print; the table of contents
  from the h2 of the text (sticky on a wide screen); the title, the date and the version; the
  text; the other documents; `LegalFooter`. Print shows the text only.
- A kind that is off, or unknown: "This document does not exist". A URL document: the page sends
  the browser to the URL.
- The legal notice shows the identity of the operator above the text. The cookie policy shows
  `TrackerTable` under the text. An empty text shows these parts only.
- **The Markdown never becomes HTML.** `markdown.presenter.ts` gives blocks of data, and
  `MarkdownView` renders each text as text. A link goes to http, https, mailto, tel or a path of
  the app; another link is text. Do not add `{@html}`.

## The admin page

- The operator, each document (off, link or Markdown, with a title, a version, a date of effect
  and a preview), the privacy contact, and the state of the consent banner from the registry.
- Each card saves its own part: `UpdateLegalSettings` changes only the fields that it gets.
- The switch "Users must accept this version again" is for the kinds of `ACCEPTANCE_KINDS`.

## Layout

```
legal.module.ts
presentation/messages/legal-document.messages.ts, legal-settings.messages.ts
presentation/presenters/markdown.presenter.ts     Markdown → blocks, table of contents
presentation/presenters/legal-page.presenter.ts   what the page of a kind shows
presentation/mappers/document-draft.mapper.ts     a document ↔ its form
presentation/ui/MarkdownView/
presentation/ui/LegalDocument/                    the public page, contents.attachments.ts
presentation/ui/LegalSettings/                    the admin page and its cards
```
