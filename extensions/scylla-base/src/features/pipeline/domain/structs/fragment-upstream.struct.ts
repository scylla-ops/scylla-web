import {
  latestVersion,
  type FragmentEntity,
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
