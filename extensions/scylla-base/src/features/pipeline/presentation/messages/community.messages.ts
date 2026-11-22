import { msg, plural } from '@lingui/core/macro';
import type { MessageDescriptor } from '@lingui/core';
import type { MarketplaceCategory } from '@base/features/pipeline/domain/entities/fragment.entity.ts';

/** The library and the marketplace: linked and forked fragments, and the public ones. */
export const communityMessages = {
  communityFragments: msg`Community fragments`,
  browseMarketplace: msg`Browse marketplace`,
  viewOnMarketplace: msg`View on marketplace`,
  sourceFilter: msg`Source`,
  allSources: msg`All`,
  linkedCount: (count: number) => msg`Linked · ${count}`,
  forkedCount: (count: number) => msg`Forked · ${count}`,
  updateCount: (count: number) => msg`Update available · ${count}`,
  tabWithCount: (label: string, count: number) => msg`${label} · ${count}`,
  noCommunity: msg`No fragment of the marketplace yet. Browse the marketplace to add one, linked or as a fork.`,
  linkedTo: (publisher: string) => msg`Linked to @${publisher}`,
  forkedFrom: (reference: string) => msg`Forked from ${reference}`,
  addedBy: (name: string, date: string) => msg`Added by ${name} · ${date}`,
  forkedBy: (name: string, date: string) => msg`Forked by ${name} · ${date}`,
  verified: msg`Verified publisher`,
  availableOnMarketplace: (number: number) => msg`v${number} available on the marketplace`,
  upstreamReleased: (number: number) => msg`Upstream v${number} released`,
  compare: msg`Compare`,

  organizationBadge: msg`Organization`,
  publicBadge: (name: string) => msg`Public · ${name}`,
  linkedBadge: (publisher: string) => msg`Linked · @${publisher}`,
  forkBadge: (reference: string, number: number) => msg`Fork of ${reference} v${number}`,
  linkedToSubtitle: (publisher: string) => msg`linked to @${publisher}`,
  useInPipeline: msg`Use in a pipeline`,
  publishToMarketplace: msg`Publish to marketplace`,
  detachAsFork: msg`Detach as fork`,

  linkedNoticeTitle: (reference: string) => msg`Linked to ${reference}`,
  linkedNotice: (workspace: string) =>
    msg`Read-only in ${workspace}. Upstream versions are reviewed here by an admin before pipelines are offered the update.`,

  upstreamTitle: (number: number, publisher: string) =>
    msg`v${number} is available from @${publisher}`,
  releasedOn: (date: string) => msg`released ${date}`,
  compareVersions: (from: number, to: number) => msg`Compare v${from} and v${to}`,
  changesHeading: msg`Changes`,
  impactHeading: (workspace: string) => msg`Impact on ${workspace}`,
  canSwitch: (count: number, total: number) =>
    msg`${count} of ${total} pipelines can switch as is.`,
  pinned: (count: number, key: string, value: string, names: string) =>
    msg`${plural(count, { one: `# pins ${key}=${value} and keeps it: ${names}.`, other: `# pin ${key}=${value} and keep it: ${names}.` })}`,
  valuesKept: msg`Parameter values set in pipelines are kept`,
  acceptHint: msg`Accepting adds the version to the library. Each pipeline then gets the usual proposal: nothing switches on its own.`,
  adminOnlyHint: msg`Only the admins of the workspace accept or skip an upstream version.`,
  skip: (number: number) => msg`Skip v${number}`,
  accept: (number: number) => msg`Accept v${number} in the library`,

  forkUpstreamTitle: (reference: string, number: number) =>
    msg`Upstream ${reference} released v${number}`,
  forkUpstreamHint: msg`A fork never updates by itself: port the changes in the editor, or start a new fork from this version.`,
  dismiss: msg`Dismiss`,
  newForkFrom: (number: number) => msg`New fork from v${number}`,

  nodeAdded: (id: string) => msg`New node: ${id}`,
  nodeRemoved: (id: string) => msg`Removed node: ${id}`,
  nodeChanged: (id: string) => msg`Changed node: ${id}`,
  parameterAdded: (key: string) => msg`New parameter: ${key}`,
  parameterRemoved: (key: string) => msg`Removed parameter: ${key}`,
  defaultChanged: (key: string, from: string, to: string) => msg`${key} default ${from} → ${to}`,
  noDifference: msg`The two versions run the same nodes with the same parameters.`,
  compareTitle: (name: string, from: string, to: string) => msg`${name}: ${from} → ${to}`,
  compareDescription: msg`What changes for a pipeline that switches.`,
  close: msg`Close`,

  versionNotInLibrary: msg`not in library yet`,
  versionSkipped: msg`skipped`,
  versionBase: msg`upstream base`,
  versionPublic: msg`public`,
  versionPrivate: (workspace: string) => msg`${workspace} only`,
  versionDeprecated: msg`deprecated`,
  publishNext: (number: number) => msg`Publish v${number}`,
  makePublic: (number: number) => msg`Make v${number} public`,
  linkedPolicy: (workspace: string) =>
    msg`Only ${workspace} admins accept or skip an upstream version.`,
  forkPolicy: (author: string, workspace: string) =>
    msg`${workspace} owns this fork: ${author} and ${workspace} admins publish its versions.`,
  privateFirstPolicy: (workspace: string) =>
    msg`A new version goes to the ${workspace} library first. The author or an admin then chooses to make it public.`,
  pinsValue: (key: string, value: string) => msg`pins ${key}=${value}`,

  onMarketplace: msg`On the marketplace`,
  publishedOn: (date: string, name: string) => msg`Published ${date} by ${name}`,
  installs: msg`Installs`,
  organizations: msg`Organizations`,
  stars: msg`Stars`,
  forks: msg`Forks`,
  adoptionHeading: msg`Versions in use by other organizations`,
  adoptionRow: (number: number, count: number) =>
    msg`${plural(count, { one: `v${number} · # organization`, other: `v${number} · # organizations` })}`,
  noAdoption: msg`No organization uses it yet.`,
  deprecateHint: msg`Need to stop a version? Organizations already using it keep it, new ones cannot add it.`,
  deprecate: (number: number) => msg`Deprecate v${number}`,

  publishTitle: (name: string) => msg`Publish ${name} to the marketplace`,
  publishDescription: (workspace: string) =>
    msg`Any Scylla organization will be able to add it. ${workspace} stays the owner and the only one who can publish versions.`,
  publicName: msg`Public name`,
  publicNameHint: msg`Stays the same across versions.`,
  version: msg`Version`,
  license: msg`License`,
  category: msg`Category`,
  tags: msg`Tags`,
  categories: {
    ci: msg`CI`,
    build: msg`Build`,
    deploy: msg`Deploy`,
    security: msg`Security`,
    release: msg`Release`,
  } satisfies Record<MarketplaceCategory, MessageDescriptor>,
  beforePublishing: msg`Before publishing`,
  checksPassed: (passed: number, total: number) => msg`${passed} of ${total} passed`,
  checkSecretDefaults: msg`No secret values in defaults`,
  checkSecretDefaultsFailed: (keys: string) =>
    msg`${keys} look like secrets: remove their default value.`,
  checkSecretsRequired: (keys: string) =>
    msg`${keys} stay required secrets, filled by whoever uses it.`,
  checkDocumented: msg`Every parameter is documented`,
  checkUndocumented: (keys: string) =>
    msg`Describe ${keys}: other organizations only see the description.`,
  checkPrivateDefaults: msg`No default points to a private address`,
  checkPrivateDefaultsFailed: (keys: string) =>
    msg`The default of ${keys} names a private address. Other organizations cannot reach it: clear the default, or say it in the description.`,
  checkReferences: (workspace: string) => msg`No reference to ${workspace} in the nodes`,
  checkReferencesFailed: (nodes: string) =>
    msg`${nodes} name the workspace. Remove the reference before publishing.`,
  autoPublish: msg`Publish next versions automatically`,
  autoPublishHint: msg`Off: each new library version asks whether to make it public.`,
  publish: (number: number) => msg`Publish v${number}`,
  cancel: msg`Cancel`,
  publishedTitle: msg`Published to the marketplace`,

  addedTitle: msg`Added to the library`,
  addedDetail: (name: string) =>
    msg`${name} is in the library: drop it in a pipeline from the palette.`,

  usePipelineTitle: (name: string) => msg`Use ${name} in a pipeline`,
  usePipelineDescription: (name: string) =>
    msg`Open a pipeline, then drop ${name} from the Library tab of the palette.`,
  publishVersionTitle: (name: string, number: number) => msg`Publish ${name} v${number}`,
  publishVersionDescription: (name: string) =>
    msg`Open the pipeline that holds the new nodes, select them, then save them to the library under the name ${name}.`,
  searchPipelines: msg`Search pipelines…`,
  noPipeline: msg`No pipeline matches.`,
  loadingPipelines: msg`Loading the pipelines…`,
};
