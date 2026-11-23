# `platform/legal`

> [Scylla frontend](../../../../../README.md) › `platform/legal` · [agent guide](./AGENTS.md)

The legal settings of the server: the legal documents, the identity of the operator and the
privacy contact. An instance admin sets them on the page "Legal and privacy"
([`features/legal`](../../features/legal/README.md)). Anyone reads them, with no session.

## Why a capability

The sign-in pages, the user menu of the shell and the legal pages all show the links to the
documents. A feature cannot be imported by the shell and by the other features at the same time
without a cycle, so the data lives here, under them.

## What it gives

- `legalQueries.info()`: the settings, from `GetLegalInfo`. The call needs no token.
- `legalLinks(info, kinds)`: the links to the documents that are on. A document is a page of
  another site (it opens in a new tab), or a text in Markdown that the page `/legal/<kind>` shows.
  A kind that is off has no link. Each link shows the title of its kind, in the language of the
  UI: the operator writes the title of a document in one language, and only the page of the
  document shows it.
- `LegalFooter`: the row of links under the public pages ("Legal notice · Privacy · Cookies ·
  Terms") and "© year operator". It shows nothing while the operator set nothing.

The code holds no legal text of a company: each operator writes its own documents.
