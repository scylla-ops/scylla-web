import { msg, plural } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { PackageOrder } from '@base/features/marketplace/presentation/presenters/package-filter.presenter.ts';

export const marketplaceMessages = {
  title: msg`Marketplace`,
  subtitle: msg`Pipeline fragments shared by the Scylla community.`,
  search: msg`Search fragments, steps, publishers…`,
  sortBy: msg`Sort by`,
  orders: {
    'most-starred': msg`Most starred`,
    recent: msg`Recently updated`,
    name: msg`Name`,
  } satisfies Record<PackageOrder, MessageDescriptor>,
  publishFragment: msg`Publish a fragment`,

  explore: msg`Explore`,
  addedTo: (workspace: string, count: number) => msg`Added to ${workspace} · ${count}`,
  publishedBy: (workspace: string, count: number) => msg`Published by ${workspace} · ${count}`,

  publisherHeading: msg`Publisher`,
  verifiedOnly: msg`Verified only`,
  officialOnly: msg`Official · Scylla`,
  categoryHeading: msg`Category`,
  stackHeading: msg`Stack`,
  runsOnYourAgents: msg`Fragments run on your own agents. Check the steps and required secrets before adding one.`,
  /** A title, as in `FeatureHeader`: "3 Fragments" in English, "3 fragments" in French. */
  fragmentCount: (count: number) =>
    msg`${plural(count, { one: '# Fragment', other: '# Fragments' })}`,
  verifiedPublishers: msg`verified publishers`,
  clearFilters: msg`Clear filters`,
  noMatch: msg`No fragment matches these filters.`,
  noneAdded: (workspace: string) =>
    msg`${workspace} has not added a fragment yet. Add one linked to receive its new versions, or fork it.`,
  nonePublished: (workspace: string) =>
    msg`${workspace} has not published a fragment yet. Publish one from its page in the library.`,
  loadError: msg`The marketplace could not be loaded.`,

  stars: (count: string) => msg`${count} stars`,
  inLibrary: msg`In library`,
  inLibraryVersion: (version: number) => msg`In library · v${version}`,
  official: msg`Official`,
  new: msg`New`,
  updated: (date: string) => msg`Updated ${date}`,
  verifiedPublisher: msg`Verified publisher`,

  notFound: msg`This package does not exist, or is no longer in the marketplace.`,
  byPublisher: (handle: string) => msg`by @${handle}`,
  star: (count: string) => msg`Star · ${count}`,
  starred: (count: string) => msg`Starred · ${count}`,
  fork: msg`Fork`,
  addToLibrary: msg`Add to library`,
  openInLibrary: msg`Open in library`,
  overview: msg`Overview`,
  versionsTab: (count: number) => msg`Versions · ${count}`,
  readme: msg`Readme`,

  notInLibraryTitle: (workspace: string) => msg`Not in the ${workspace} library yet`,
  notInLibrary: (workspace: string) =>
    msg`Add it linked to receive new versions, or fork it into an editable copy owned by ${workspace}.`,
  linkedTitle: (workspace: string, version: number) =>
    msg`In the ${workspace} library · linked v${version}`,
  linkedDetail: msg`New versions of the publisher wait for an admin in the library.`,
  forkedTitle: (workspace: string, name: string) => msg`Forked in ${workspace} as ${name}`,
  forkedDetail: msg`The fork is an editable copy: releases of the publisher are shown on its page, never applied.`,
  ownTitle: (workspace: string) => msg`Published by ${workspace}`,
  ownDetail: msg`Its versions, stars and adoption are followed on its page in the library.`,

  versions: msg`Versions`,
  deprecated: msg`deprecated`,
  immutableVersions: msg`Versions are immutable. Your library decides when to move to a new one.`,

  beforeYouAdd: msg`Before you add it`,
  secretRequirement: msg`Secret you provide in each pipeline`,
  agentRequirement: msg`Installed on the agent`,
  networkRequirement: msg`Network`,
  secretTag: msg`secret`,
  agentTag: msg`agent`,
  networkTag: msg`net`,
  nothingRequired: msg`No secret, no tool beyond the shell of the agent.`,

  addTitle: (name: string, workspace: string) => msg`Add ${name} to the ${workspace} library`,
  addDescription: (handle: string, workspace: string) =>
    msg`By @${handle}. Once added, everyone in ${workspace} can drop it in a pipeline.`,
  howToUse: (workspace: string) => msg`How should ${workspace} use it?`,
  linked: msg`Linked`,
  recommended: msg`Recommended`,
  linkedHint: (workspace: string, handle: string) =>
    msg`Read-only in ${workspace}. New versions from @${handle} appear in the library, an admin accepts them, then each pipeline chooses when to switch.`,
  forkHint: (workspace: string) =>
    msg`Editable copy owned by ${workspace}, published as ${workspace} versions (v1, v2…). Upstream releases are shown for information, never applied.`,
  version: msg`Version`,
  latestVersion: (version: number) => msg`v${version} · latest`,
  versionOption: (version: number) => msg`v${version}`,
  olderVersionsStay: msg`Older versions stay available.`,
  nameInLibrary: msg`Name in the library`,
  shownAs: (name: string, handle: string) => msg`Shown as ${name} · @${handle}.`,
  nameTaken: (name: string) => msg`The library already has a fragment named ${name}.`,
  needsSecrets: (count: number, keys: string) =>
    msg`${plural(count, { one: `Needs # secret: ${keys}`, other: `Needs # secrets: ${keys}` })}`,
  secretsNotice: (workspace: string) =>
    msg`Asked when the fragment is dropped in a pipeline, like any parameter. Secret values never leave ${workspace}.`,
  addVersion: (version: number) => msg`Add v${version} to library`,
  cancel: msg`Cancel`,
};
