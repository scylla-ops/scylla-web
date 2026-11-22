# `features/legal`

> [Scylla frontend](../../../../../README.md) › `features/legal` · [agent guide](./AGENTS.md)

The legal pages of the server.

- **`/legal/<kind>`**, public: the legal notice, the privacy policy, the cookie policy, the terms
  of service, the terms of sale, the data processing agreement and the list of the
  sub-processors. One frame for all: a table of contents, the date and the version, a print
  style. The cookie policy lists each tracker of the app, from the registry of
  [`platform/trackers`](../../platform/trackers/README.md).
- **`/instance/legal`**, for the instance admins: the identity of the operator, each document
  (off, a link to a page of the operator, or a text in Markdown), the privacy contact and the
  state of the consent banner.

Scylla holds no legal text of a company: the operator of each server writes its own documents.
The Markdown is read into data and rendered as text, never as HTML.
