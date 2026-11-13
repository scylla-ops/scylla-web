import type { CommitRef } from '@base/features/pipeline/domain/structs/commit-ref.struct.ts';

/**
 * A ref ↔ the value of a row of a picker. The kind is in the value: a branch and a tag can have
 * the same name.
 */
export const toValue = (ref: CommitRef): string =>
  ref.kind === 'sha' ? `sha:${ref.sha}` : `${ref.kind}:${ref.name}`;

/** `undefined` for a value that no picker gives. */
export const fromValue = (value: string): CommitRef | undefined => {
  const at = value.indexOf(':');
  const kind = value.slice(0, at);
  const name = value.slice(at + 1);
  if (at < 0 || !name) return undefined;
  if (kind === 'branch' || kind === 'tag') return { kind, name };
  return kind === 'sha' ? { kind, sha: name } : undefined;
};
