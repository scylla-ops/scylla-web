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

/** The nodes of a fragment on one line, such as `fmt · clippy · test`. */
export const nodesLine = (nodes: PipelineNodeEntity[], prefix = ''): string =>
  nodes
    .map(node => (prefix && node.id.startsWith(prefix) ? node.id.slice(prefix.length) : node.id))
    .join(' · ');

/** What a node runs, on one line: its command, or the first line of its script. */
export const nodeCommandLine = (node: PipelineNodeEntity): string =>
  node.kind === 'exec'
    ? [node.command, ...node.args].join(' ')
    : (node.script.split('\n').find(line => line.trim()) ?? '').trim();

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

export interface FragmentFilter {
  query: string;
  tag: string | null;
  favoritesOnly: boolean;
  order: FragmentOrder;
}

/** A search reads the name, the description, the tags and the ids of the nodes of the latest version. */
const searchFields = (fragment: FragmentEntity) => [
  fragment.name,
  fragment.description,
  ...fragment.tags,
  ...latestVersion(fragment).nodes.map(node => node.id),
];

export const filterFragments = (
  fragments: readonly FragmentEntity[],
  { query, tag, favoritesOnly, order }: FragmentFilter,
): FragmentEntity[] =>
  fragments
    .filter(fragment => !favoritesOnly || fragment.favorite)
    .filter(fragment => !tag || fragment.tags.includes(tag))
    .filter(fragment => matchesSearch(query, searchFields(fragment)))
    .sort(COMPARE[order]);

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
