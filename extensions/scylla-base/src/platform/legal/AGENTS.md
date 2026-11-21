# `platform/legal` — agent guide

The legal settings of the server (`scylla.platform.v1.LegalService`): the documents that the
operator turned on, its identity and its privacy contact. The shell, the sign-in pages and the
legal pages read them.

**Layer** `platform/` · alias `@platform/legal`

## Import rules

- **MUST NEVER import a feature** (`platform-knows-no-feature`, error).
- Consumers import `@platform/legal`: the barrel, never a deep path.

## Public API — `index.ts`

```typescript
LEGAL_DOCUMENT_KINDS, ACCEPTANCE_KINDS, isLegalDocumentKind, legalPagePath, legalDocumentHref
type LegalDocument, LegalDocumentContent, LegalDocumentKind
EMPTY_OPERATOR, legalDocumentOf
termsToAccept(info)          the terms that each user must accept, or undefined
type LegalInfo, LegalOperator, LegalDocumentChange, UpdateLegalSettingsInput, LegalRepository
legalQueries.info()          public: no session, no permission (GetLegalInfo)
legalMutations.update()      instance admins: the page checks MANAGE_INSTANCE_SETTINGS
LEGAL_INFO_QUERY_KEY
legalKindTitles, legalKindLinks, legalMessages
legalLinks(info, kinds?, short?), legalDocumentTitle, FOOTER_KINDS, type LegalLink
LegalFooter                  Svelte: the links of FOOTER_KINDS, "Cookie settings" while one
                             tracker needs consent (`@platform/consent`), and "© <year> <operator>"
withLegalRepository(repo)    for a test: replaces the repository, gives the restore function
```

## The rules

- **A kind that is off has no page and no link.** `legalLinks` gives the documents that are on
  only. Never link `/legal/<kind>` without it.
- **A document is a URL or a text in Markdown.** A link to a URL document opens the URL in a new
  tab. A link to a Markdown document opens `/legal/<kind>` (`features/legal`). The mails of the
  server use the same rule.
- **The paths `/legal/<kind>` are stable.** The kinds: `legal-notice`, `privacy`, `cookies`,
  `terms`, `terms-of-sale`, `dpa`, `subprocessors`.
- **`GetLegalInfo` needs no session.** It is in `PUBLIC_METHODS` (`platform/grpc/session.ts`):
  the sign-in pages read it.
- `version` and `acceptanceRequired` of the terms are for the acceptance of the terms. Only the
  kinds of `ACCEPTANCE_KINDS` show the switch. `termsToAccept` gives the terms to accept: the
  sign-up form, the sign-in page and the terms step of `features/login` read it, and show nothing
  when it is `undefined`.
- Write no legal text of a company here: the operator writes its documents.

## Layout

```
index.ts
legal-repository.ts                          the repository: made on the first read, or a test fake
domain/structs/legal-document.struct.ts      kinds, document, href
domain/structs/legal-info.struct.ts          operator, info, the change of the settings
domain/repository/legal.repository.ts
infrastructure/default-legal.repository.ts   LegalServiceClient → domain
infrastructure/grpc-legal.mapper.ts
presentation/legal.queries.ts
presentation/messages/legal.messages.ts      the titles of the kinds
presentation/presenters/legal-links.presenter.ts
presentation/ui/LegalFooter/                 under AuthLayout and the legal pages
```

## Before done

`pnpm test:dir extensions/scylla-base/src/platform/legal`, then the gates of the root `AGENTS.md`.
