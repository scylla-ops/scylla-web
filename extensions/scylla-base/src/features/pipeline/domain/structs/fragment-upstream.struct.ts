import {
  latestVersion,
  type FragmentEntity,
  type FragmentSource,
  type FragmentUsage,
  type FragmentVersion,
} from '@base/features/pipeline/domain/entities/fragment.entity.ts';

type Upstream = Pick<FragmentEntity, 'versions' | 'source'>;

/**
 * The version of the publisher that waits for a decision of the workspace: for a linked
 * fragment, the newest one that is not accepted nor skipped; for a fork, the release after its
 * base, until it is dismissed.
 */
export const pendingUpstream = ({ versions, source }: Upstream): FragmentVersion | null => {
  if (!source) return null;
  if (source.kind === 'forked') return source.upstream;
  const latest = latestVersion({ versions }).number;
  const pending = source.upstream.filter(
    version => version.number > latest && !source.skipped.includes(version.number),
  );
  return pending.at(-1) ?? null;
};

/** Only the admins of the workspace accept or skip a version of the publisher. */
export const canDecideUpstream = (person: { admin: boolean }): boolean => person.admin;

const linkedSource = (fragment: Upstream) => {
  if (fragment.source?.kind !== 'linked') throw new Error('The fragment is not linked');
  return fragment.source;
};

/** The version joins the library: each pipeline is then proposed it, as any new version. */
export const acceptUpstream = (fragment: Upstream, number: number): Upstream => {
  const source = linkedSource(fragment);
  const version = source.upstream.find(upstream => upstream.number === number);
  if (!version) throw new Error(`The publisher has no version ${number}`);
  return {
    versions: [...fragment.versions, version].sort((a, b) => a.number - b.number),
    source: { ...source, upstream: source.upstream.filter(upstream => upstream.number !== number) },
  };
};

export const skipUpstream = (fragment: Upstream, number: number): Upstream => {
  const source = linkedSource(fragment);
  return {
    versions: fragment.versions,
    source: { ...source, skipped: [...source.skipped, number] },
  };
};

/** The release of the publisher is no longer shown on the fork. */
export const dismissUpstream = (fragment: Upstream): Upstream => {
  if (fragment.source?.kind !== 'forked') throw new Error('The fragment is not a fork');
  return { versions: fragment.versions, source: { ...fragment.source, upstream: null } };
};

/**
 * A linked fragment becomes a fork that the workspace edits. Its versions keep their numbers:
 * the pipelines link them.
 */
export const detachAsFork = (fragment: Upstream): Upstream => {
  const source = linkedSource(fragment);
  const forked: FragmentSource = {
    kind: 'forked',
    package: source.package,
    addedAt: source.addedAt,
    baseVersion: latestVersion(fragment).number,
    upstream: pendingUpstream(fragment),
  };
  return { versions: fragment.versions, source: forked };
};

/**
 * A pipeline that gave a parameter its own value keeps it on the new version: it does not get
 * the new default. The admin sees these pipelines before accepting the version.
 */
export interface PinnedValue {
  usage: FragmentUsage;
  key: string;
  value: string;
}

export const pinnedValues = (
  usages: readonly FragmentUsage[],
  from: FragmentVersion,
  to: FragmentVersion,
): PinnedValue[] => {
  const defaults = new Map(
    to.parameters.flatMap(parameter =>
      parameter.kind === 'literal' ? [[parameter.key, parameter.default] as const] : [],
    ),
  );
  return usages.flatMap(usage =>
    from.parameters.flatMap(parameter => {
      const next = defaults.get(parameter.key);
      const value = usage.values[parameter.key];
      const changed =
        parameter.kind === 'literal' && next !== undefined && next !== parameter.default;
      return changed && value !== undefined && value !== parameter.default
        ? [{ usage, key: parameter.key, value }]
        : [];
    }),
  );
};
