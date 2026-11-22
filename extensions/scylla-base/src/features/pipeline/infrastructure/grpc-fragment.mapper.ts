import type {
  Fragment,
  FragmentOrigin as GrpcOrigin,
  FragmentAuthor as GrpcAuthor,
  FragmentParameter as GrpcParameter,
  FragmentUsage as GrpcUsage,
  FragmentVersion as GrpcVersion,
} from '@base/generated/scylla/library/v1/fragment.ts';
import { FragmentVersion as GrpcVersionMessage, ParameterKind } from '@base/generated/scylla/library/v1/fragment.ts';
import type { FragmentLink as GrpcLink } from '@base/generated/scylla/pipelines/v1/pipeline.ts';
import {
  PackageCategory,
  type Package,
  type Publication,
} from '@base/generated/scylla/marketplace/v1/package.ts';
import { idValue, required, timestampToIso, wrapId } from '@shared/infrastructure/grpc/wrappers.ts';
import type {
  FragmentAuthor,
  FragmentEntity,
  FragmentLink,
  FragmentParameter,
  FragmentPublication,
  FragmentSource,
  FragmentUsage,
  FragmentVersion,
  MarketplaceCategory,
  PackageRef,
} from '../domain/entities/fragment.entity.ts';
import { nodeToDomain } from './grpc-pipeline.mapper.ts';

const authorToDomain = (author: GrpcAuthor | undefined): FragmentAuthor => ({
  id: idValue(author?.id),
  name: author?.name ?? '',
});

export const parameterToDomain = (parameter: GrpcParameter): FragmentParameter => {
  const description = parameter.description ? { description: parameter.description } : {};
  return parameter.kind === ParameterKind.SECRET
    ? { key: parameter.key, kind: 'secret', ...description }
    : { key: parameter.key, kind: 'literal', default: parameter.defaultValue, ...description };
};

export const parameterFromDomain = (parameter: FragmentParameter): GrpcParameter => ({
  key: parameter.key,
  kind: parameter.kind === 'secret' ? ParameterKind.SECRET : ParameterKind.LITERAL,
  defaultValue: parameter.kind === 'literal' ? parameter.default : '',
  description: parameter.description ?? '',
});

export const versionToDomain = (version: GrpcVersion): FragmentVersion => ({
  number: version.number,
  nodes: version.nodes.map(nodeToDomain),
  parameters: version.parameters.map(parameterToDomain),
  changes: version.changes,
  author: authorToDomain(version.author),
  publishedAt: timestampToIso(version.publishedAt),
});

const usageToDomain = (usage: GrpcUsage): FragmentUsage => ({
  pipelineId: idValue(usage.pipelineId),
  pipelineName: usage.pipelineName,
  projectId: idValue(usage.projectId),
  projectName: usage.projectName,
  version: usage.version,
  values: { ...usage.values },
});

/** A fragment of the core library: it has no source and no publication of the marketplace. */
export const toDomain = (fragment: Fragment | undefined): FragmentEntity => {
  const found = required(fragment, 'fragment');
  return {
    id: idValue(found.id),
    workspaceId: idValue(found.workspaceId),
    name: found.name,
    description: found.description,
    tags: found.tags,
    author: authorToDomain(found.author),
    versions: found.versions.map(versionToDomain),
    favorite: found.favorite,
    usages: found.usages.map(usageToDomain),
  };
};

export const linkToDomain = (link: GrpcLink): FragmentLink => ({
  blockId: link.blockId,
  fragmentId: idValue(link.fragmentId),
  version: link.version,
  values: { ...link.values },
  nodeIds: link.nodeIds,
  ...(link.skippedVersion !== undefined && { skippedVersion: link.skippedVersion }),
});

export const linkFromDomain = (link: FragmentLink): GrpcLink => ({
  blockId: link.blockId,
  fragmentId: wrapId(link.fragmentId),
  version: link.version,
  values: link.values,
  nodeIds: link.nodeIds,
  ...(link.skippedVersion !== undefined && { skippedVersion: link.skippedVersion }),
});


/**
 * The content of a version of a package of the marketplace: an encoded `FragmentVersion` with no
 * author. The author shown is the publisher.
 */
export const versionFromContent = (content: Uint8Array, publisher: string): FragmentVersion => {
  const version = versionToDomain(GrpcVersionMessage.fromBinary(content));
  return { ...version, author: { id: '', name: publisher } };
};

const CATEGORIES: Record<PackageCategory, MarketplaceCategory> = {
  [PackageCategory.UNSPECIFIED]: 'ci',
  [PackageCategory.CI]: 'ci',
  [PackageCategory.BUILD]: 'build',
  [PackageCategory.DEPLOY]: 'deploy',
  [PackageCategory.SECURITY]: 'security',
  [PackageCategory.RELEASE]: 'release',
};

export const categoryToDomain = (category: PackageCategory): MarketplaceCategory =>
  CATEGORIES[category] ?? 'ci';

export const categoryToProto = (category: MarketplaceCategory): PackageCategory =>
  ({
    ci: PackageCategory.CI,
    build: PackageCategory.BUILD,
    deploy: PackageCategory.DEPLOY,
    security: PackageCategory.SECURITY,
    release: PackageCategory.RELEASE,
  })[category];

/** `@publisher/name`, as the origin of a fragment keeps it. */
const packageRef = (origin: GrpcOrigin): PackageRef => {
  const [publisher = '', name = ''] = origin.packageName.replace(/^@/, '').split('/');
  return { packageId: origin.packageId, publisher, name, verified: false };
};

/** The versions of a package that a workspace can still take: public and not deprecated. */
const openVersions = (pkg: Package): FragmentVersion[] =>
  pkg.versions
    .filter(version => !version.deprecated && version.content.length > 0)
    .map(version => versionFromContent(version.content, pkg.publisher));

/**
 * Where a fragment comes from, with the versions of its package that it can take. A linked
 * fragment: each version after its latest one (`pendingUpstream` leaves out the skipped ones). A
 * fork: the latest version after its base, until it dismisses it. No package (the marketplace did
 * not answer): no version to take.
 */
export const sourceOf = (origin: GrpcOrigin, latest: number, pkg?: Package): FragmentSource => {
  const versions = pkg ? openVersions(pkg) : [];
  const common = { package: packageRef(origin), addedAt: timestampToIso(origin.addedAt) };
  if (origin.linked) {
    return {
      kind: 'linked',
      ...common,
      upstream: versions.filter(version => version.number > latest),
      skipped: origin.skipped,
    };
  }
  const after = Math.max(origin.baseVersion, origin.dismissed ?? 0);
  return {
    kind: 'forked',
    ...common,
    baseVersion: origin.baseVersion,
    upstream: versions.filter(version => version.number > after).at(-1) ?? null,
  };
};

/** A public fragment of the workspace, as the marketplace of its server tells it. */
export const publicationOf = (publication: Publication, name: string): FragmentPublication => ({
  packageId: idValue(publication.packageId),
  name,
  license: publication.license,
  category: categoryToDomain(publication.category),
  versions: publication.versions,
  autoPublish: publication.autoPublish,
  deprecated: publication.deprecated,
  publishedAt: timestampToIso(publication.publishedAt),
  publishedBy: { id: idValue(publication.publishedBy), name: publication.publishedByName },
  stats: { stars: publication.stars },
});
