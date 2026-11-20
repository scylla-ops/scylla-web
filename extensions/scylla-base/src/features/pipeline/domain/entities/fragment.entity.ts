import type { NodeId } from '../structs/node-id.struct.ts';
import type { EnvEntry, PipelineNodeEntity } from './pipeline-node.entity.ts';

/**
 * A fragment: some nodes of a pipeline, saved in the library of the workspace so that other
 * pipelines use them. A pipeline links a version of a fragment (`FragmentLink`); a new version
 * is proposed to the pipelines, never forced on them.
 */
export interface FragmentEntity {
  id: string;
  workspaceId: string;
  /** Unique in the workspace. It follows the rule of a node id: it is the id of the block. */
  name: string;
  description: string;
  tags: string[];
  author: FragmentAuthor;
  /** The oldest first. A fragment always has one version at least. */
  versions: FragmentVersion[];
  /** Of the person who reads the library. */
  favorite: boolean;
  usages: FragmentUsage[];
  /** A fragment of the marketplace. None: the workspace made it. */
  source?: FragmentSource;
  /** The workspace made the fragment public on the marketplace. */
  publication?: FragmentPublication;
}

export interface FragmentAuthor {
  id: string;
  name: string;
}

export interface FragmentVersion {
  /** 1, 2, 3… */
  number: number;
  /** The nodes. Their dependencies point to other nodes of the fragment only. */
  nodes: PipelineNodeEntity[];
  parameters: FragmentParameter[];
  /** What changed since the version before, one line each. */
  changes: string[];
  author: FragmentAuthor;
  publishedAt: string;
}

/**
 * A value that each pipeline gives to the fragment: an environment variable of its nodes. A
 * secret has no default: the client never holds a secret value, only the name of a project
 * secret.
 */
export type FragmentParameter =
  | { key: string; kind: 'literal'; default: string; description?: string }
  | { key: string; kind: 'secret'; description?: string };

/** A pipeline that links the fragment, and the version it links. */
export interface FragmentUsage {
  pipelineId: string;
  pipelineName: string;
  projectId: string;
  projectName: string;
  version: number;
  /** The values that the pipeline gives to the parameters. */
  values: ParameterValues;
}

/** A fragment of the marketplace, by its public name `@publisher/name`. */
export interface PackageRef {
  packageId: string;
  publisher: string;
  name: string;
  verified: boolean;
}

/**
 * Where a fragment of the marketplace comes from.
 * - `linked`: read only in the workspace. A version of the publisher comes in `upstream`, and an
 *   admin accepts it into the library or skips it.
 * - `forked`: a copy that the workspace owns and edits. `upstream` is a release of the publisher
 *   after `baseVersion`, shown for information until it is dismissed.
 */
export type FragmentSource =
  | {
      kind: 'linked';
      package: PackageRef;
      /** When the workspace added it. */
      addedAt: string;
      upstream: FragmentVersion[];
      skipped: number[];
    }
  | {
      kind: 'forked';
      package: PackageRef;
      addedAt: string;
      baseVersion: number;
      upstream: FragmentVersion | null;
    };

/** What the marketplace tells the publisher about a public fragment. */
export interface PublicationStats {
  installs: number;
  organizations: number;
  stars: number;
  forks: number;
  /** How many organizations use each public version. */
  adoption: { version: number; organizations: number }[];
}

/** A fragment of the workspace made public. Only the versions in `versions` are public. */
export interface FragmentPublication {
  /** `@workspace/name`. It stays the same across versions. */
  name: string;
  license: string;
  category: string;
  versions: number[];
  /** A new version of the library is public at once. */
  autoPublish: boolean;
  /** No new organization can add them. */
  deprecated: number[];
  publishedAt: string;
  publishedBy: FragmentAuthor;
  stats: PublicationStats;
}

/** The value of each parameter in one pipeline: a literal, or the name of a project secret. */
export type ParameterValues = Record<string, string>;

/**
 * A block of a pipeline that links a version of a fragment. The pipeline holds the nodes
 * themselves (`nodeIds`), so that the server runs them as any other node.
 */
export interface FragmentLink {
  /** The id of the block in the graph. No node of the pipeline has it. */
  blockId: NodeId;
  fragmentId: string;
  version: number;
  values: ParameterValues;
  nodeIds: NodeId[];
  /** The newest version that the pipeline chose not to take. */
  skippedVersion?: number;
}

export interface CreateFragmentInput {
  workspaceId: string;
  name: string;
  description: string;
  tags: string[];
  nodes: PipelineNodeEntity[];
  parameters: FragmentParameter[];
  author: FragmentAuthor;
  /** The name of the pipeline the nodes come from. */
  sourcePipeline: string;
}

/** A fragment of the marketplace, added to the library linked or as a fork. */
export interface AddCommunityFragmentInput {
  workspaceId: string;
  mode: 'linked' | 'forked';
  /** The name in the library. */
  name: string;
  description: string;
  tags: string[];
  package: PackageRef;
  version: FragmentVersion;
  /** The versions of the publisher after `version`. */
  newer: FragmentVersion[];
  author: FragmentAuthor;
}

export interface PublishToMarketplaceInput {
  id: string;
  /** The slug of the workspace: the scope of the public name. */
  scope: string;
  version: number;
  license: string;
  category: string;
  tags: string[];
  autoPublish: boolean;
  author: FragmentAuthor;
}

export interface PublishFragmentVersionInput {
  id: string;
  nodes: PipelineNodeEntity[];
  parameters: FragmentParameter[];
  changes: string[];
  author: FragmentAuthor;
}

/** The pipeline whose links are saved: the library shows where a fragment is used. */
export interface LinkingPipeline {
  pipelineId: string;
  pipelineName: string;
  projectId: string;
  projectName: string;
}

export const latestVersion = (fragment: Pick<FragmentEntity, 'versions'>): FragmentVersion =>
  fragment.versions[fragment.versions.length - 1];

export const versionOf = (fragment: FragmentEntity, number: number): FragmentVersion | undefined =>
  fragment.versions.find(version => version.number === number);

/** How many versions came after the linked one. */
export const versionsBehind = (fragment: FragmentEntity, link: Pick<FragmentLink, 'version'>) =>
  fragment.versions.filter(version => version.number > link.version).length;

/** The newest version, when the pipeline links an older one and did not skip it. */
export const proposedVersion = (
  fragment: FragmentEntity,
  link: FragmentLink,
): FragmentVersion | null => {
  const latest = latestVersion(fragment);
  if (latest.number <= link.version) return null;
  return latest.number === link.skippedVersion ? null : latest;
};

/**
 * Only the author of the fragment and the admins of the workspace publish a new version. A
 * linked fragment gets its versions from its publisher only.
 */
export const canPublishVersion = (
  fragment: Pick<FragmentEntity, 'author' | 'source'>,
  person: { id: string; admin: boolean },
): boolean =>
  fragment.source?.kind !== 'linked' && (person.admin || fragment.author.id === person.id);

/**
 * The nodes as a fragment holds them: a dependency on a node outside the selection is dropped,
 * as the pipeline that links the fragment gives it its own.
 */
export const fragmentNodesOf = (nodes: PipelineNodeEntity[]): PipelineNodeEntity[] => {
  const ids = new Set(nodes.map(node => node.id));
  return nodes.map(node => ({ ...node, deps: node.deps.filter(dep => ids.has(dep)) }));
};

/** The variables of the nodes, once each: a literal keeps its value as default. */
export const detectParameters = (nodes: PipelineNodeEntity[]): FragmentParameter[] => {
  const byKey = new Map<string, FragmentParameter>();
  for (const entry of nodes.flatMap(node => node.env)) {
    if (byKey.has(entry.key)) continue;
    byKey.set(
      entry.key,
      entry.kind === 'secret'
        ? { key: entry.key, kind: 'secret' }
        : { key: entry.key, kind: 'literal', default: entry.value },
    );
  }
  return [...byKey.values()];
};

export const defaultValues = (parameters: FragmentParameter[]): ParameterValues =>
  Object.fromEntries(
    parameters.map(parameter => [
      parameter.key,
      parameter.kind === 'literal' ? parameter.default : '',
    ]),
  );

/** The values for another version: a parameter keeps the value that the pipeline gave it. */
export const carryValues = (
  parameters: FragmentParameter[],
  previous: ParameterValues,
): ParameterValues => {
  const defaults = defaultValues(parameters);
  return Object.fromEntries(
    parameters.map(({ key }) => [key, previous[key] ?? defaults[key]] as const),
  );
};

/** The parameters with no value: a secret that the pipeline did not choose yet. */
export const missingParameters = (
  parameters: FragmentParameter[],
  values: ParameterValues,
): FragmentParameter[] =>
  parameters.filter(parameter => parameter.kind === 'secret' && !values[parameter.key]?.trim());

/** The values that the nodes give to the parameters now: what a pipeline had before it linked them. */
export const valuesOf = (
  nodes: PipelineNodeEntity[],
  parameters: FragmentParameter[],
): ParameterValues => {
  const entries = new Map(nodes.flatMap(node => node.env).map(entry => [entry.key, entry]));
  return Object.fromEntries(
    parameters.map(parameter => {
      const entry = entries.get(parameter.key);
      if (!entry) return [parameter.key, parameter.kind === 'literal' ? parameter.default : ''];
      return [parameter.key, entry.kind === 'secret' ? entry.secretRef : entry.value];
    }),
  );
};

const entryFor = (parameter: FragmentParameter, value: string): EnvEntry =>
  parameter.kind === 'secret'
    ? { key: parameter.key, kind: 'secret', secretRef: value }
    : { key: parameter.key, kind: 'literal', value };

/**
 * The nodes of a version with the values of a pipeline. A node that reads a parameter gets its
 * value; a secret with no value is left out, so the client never sends an empty reference.
 */
export const withValues = (
  nodes: PipelineNodeEntity[],
  parameters: FragmentParameter[],
  values: ParameterValues,
): PipelineNodeEntity[] => {
  const byKey = new Map(parameters.map(parameter => [parameter.key, parameter]));
  return nodes.map(node => ({
    ...node,
    env: node.env.flatMap(entry => {
      const parameter = byKey.get(entry.key);
      if (!parameter) return [entry];
      const value = values[parameter.key] ?? '';
      return parameter.kind === 'secret' && !value.trim() ? [] : [entryFor(parameter, value)];
    }),
  }));
};

/**
 * The nodes of a version, as a pipeline inserts them: each id gets the prefix of the block, so
 * that two blocks of the same fragment do not share an id.
 */
export const instantiate = (
  version: FragmentVersion,
  blockId: NodeId,
  values: ParameterValues,
): PipelineNodeEntity[] => {
  const idOf = (id: NodeId) => `${blockId}-${id}`;
  const nodes = version.nodes.map(node => ({
    ...node,
    id: idOf(node.id),
    deps: node.deps.map(idOf),
  }));
  return withValues(nodes, version.parameters, values);
};
