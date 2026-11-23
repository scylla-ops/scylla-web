import { matchesSearch } from '@scylla/ui/utils';
import {
  latestVersion,
  missingParameters,
  proposedVersion,
  versionOf,
  type FragmentEntity,
  type FragmentLink,
  type FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';
import type { PipelineNodeEntity } from '@base/features/pipeline/domain/entities/pipeline-node.entity.ts';
import { pendingUpstream } from '@base/features/pipeline/domain/structs/fragment-upstream.struct.ts';

/** The nodes of a fragment on one line, such as `fmt · clippy · test`. */
export const nodesLine = (nodes: PipelineNodeEntity[], prefix = ''): string =>
  nodes
    .map(node => (prefix && node.id.startsWith(prefix) ? node.id.slice(prefix.length) : node.id))
    .join(' · ');

/** What a node runs, on one line: its command, or the first line of its script. */
export const nodeCommandLine = (node: PipelineNodeEntity): string => {
  if (node.kind === 'exec') return [node.command, ...node.args].join(' ');
  if (node.kind === 'script') return (node.script.split('\n').find(line => line.trim()) ?? '').trim();
  return node.kind;
};

/** What a block of the graph shows. Without its fragment (not loaded, or deleted), only its nodes. */
export interface BlockSummary {
  preview: string;
  version: number;
  /** A newer version that the pipeline did not take nor skip. */
  proposed: FragmentVersion | null;
  /** The parameters that still need a value. */
  missing: number;
}

export const blockSummary = (
  link: FragmentLink,
  nodes: PipelineNodeEntity[],
  fragment: FragmentEntity | undefined,
): BlockSummary => {
  const version = fragment && versionOf(fragment, link.version);
  return {
    preview: nodesLine(nodes, `${link.blockId}-`),
    version: link.version,
    proposed: fragment ? proposedVersion(fragment, link) : null,
    missing: version ? missingParameters(version.parameters, link.values).length : 0,
  };
};

/** The first block of the graph that is proposed a newer version: the canvas tells it. */
export const firstProposal = (
  links: readonly FragmentLink[],
  fragmentOf: (fragmentId: string) => FragmentEntity | undefined,
): { blockId: string; fragment: FragmentEntity; version: FragmentVersion } | null => {
  for (const link of links) {
    const fragment = fragmentOf(link.fragmentId);
    const version = fragment && proposedVersion(fragment, link);
    if (fragment && version) return { blockId: link.blockId, fragment, version };
  }
  return null;
};

export type FragmentOrder = 'most-used' | 'recent' | 'name';

export const FRAGMENT_ORDERS: readonly FragmentOrder[] = ['most-used', 'recent', 'name'];

const publishedAt = (fragment: FragmentEntity) => latestVersion(fragment).publishedAt;

const COMPARE: Record<FragmentOrder, (a: FragmentEntity, b: FragmentEntity) => number> = {
  'most-used': (a, b) => b.usages.length - a.usages.length || a.name.localeCompare(b.name),
  recent: (a, b) => publishedAt(b).localeCompare(publishedAt(a)),
  name: (a, b) => a.name.localeCompare(b.name),
};

/**
 * The organization tab holds the fragments the workspace made; the community tab, those of the
 * marketplace. The palette of the editor shows `all`.
 */
export type LibraryScope = 'organization' | 'favorites' | 'community' | 'all';

/** The chips of the community tab. */
export type SourceFilter = 'all' | 'linked' | 'forked' | 'update';

export interface FragmentFilter {
  query: string;
  scope: LibraryScope;
  tag: string | null;
  source: SourceFilter;
  order: FragmentOrder;
}

const inScope = (fragment: FragmentEntity, scope: LibraryScope): boolean => {
  if (scope === 'all') return true;
  if (scope === 'favorites') return fragment.favorite;
  return (scope === 'community') === !!fragment.source;
};

const matchesSource = (fragment: FragmentEntity, source: SourceFilter): boolean => {
  if (source === 'all') return true;
  if (source === 'update') return !!pendingUpstream(fragment);
  return fragment.source?.kind === source;
};

/** A search reads the name, the description, the tags and the ids of the nodes of the latest version. */
const searchFields = (fragment: FragmentEntity) => [
  fragment.name,
  fragment.description,
  ...fragment.tags,
  ...latestVersion(fragment).nodes.map(node => node.id),
];

export const filterFragments = (
  fragments: readonly FragmentEntity[],
  { query, scope, tag, source, order }: FragmentFilter,
): FragmentEntity[] =>
  fragments
    .filter(fragment => inScope(fragment, scope))
    .filter(fragment => !tag || fragment.tags.includes(tag))
    .filter(fragment => scope !== 'community' || matchesSource(fragment, source))
    .filter(fragment => matchesSearch(query, searchFields(fragment)))
    .sort(COMPARE[order]);

export const countInScope = (fragments: readonly FragmentEntity[], scope: LibraryScope): number =>
  fragments.filter(fragment => inScope(fragment, scope)).length;

/** How many fragments of the community tab each chip keeps. */
export const sourceCounts = (
  fragments: readonly FragmentEntity[],
): Record<Exclude<SourceFilter, 'all'>, number> => {
  const community = fragments.filter(fragment => fragment.source);
  return {
    linked: community.filter(fragment => matchesSource(fragment, 'linked')).length,
    forked: community.filter(fragment => matchesSource(fragment, 'forked')).length,
    update: community.filter(fragment => matchesSource(fragment, 'update')).length,
  };
};

/** The tags of the library, the most used first. */
export const libraryTags = (fragments: readonly FragmentEntity[]): string[] => {
  const counts = new Map<string, number>();
  for (const tag of fragments.flatMap(fragment => fragment.tags)) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
};

/** A fragment published less than a week ago, with one version. */
export const isNewFragment = (fragment: FragmentEntity, now = Date.now()): boolean =>
  fragment.versions.length === 1 &&
  now - new Date(latestVersion(fragment).publishedAt).getTime() < 7 * 24 * 60 * 60 * 1000;
