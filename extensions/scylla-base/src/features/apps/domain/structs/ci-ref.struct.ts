import type { CiIdentityEntity, CiProvider } from '../entities/ci-identity.entity.ts';

/** What the jobs of a CI identity must run on: a branch, an environment, or each ref. */
export type CiRefKind = 'branch' | 'environment' | 'any';

const GITHUB_BRANCH = 'refs/heads/';

/**
 * The server compares the `ref` claim of the ID token as it is: GitHub sends `refs/heads/main`,
 * GitLab sends `main`.
 */
export const ciRuleOf = (
  provider: CiProvider,
  kind: CiRefKind,
  value: string,
): { gitRef: string; environment: string } => {
  const text = value.trim();
  if (kind === 'any' || !text) return { gitRef: '', environment: '' };
  if (kind === 'environment') return { gitRef: '', environment: text };
  return { gitRef: provider === 'github' ? GITHUB_BRANCH + text : text, environment: '' };
};

/** The rule of an identity, as the screens show it. */
export const ciRuleText = (
  identity: Pick<CiIdentityEntity, 'gitRef' | 'environment'>,
): { kind: CiRefKind; value: string } => {
  if (identity.environment) return { kind: 'environment', value: identity.environment };
  if (identity.gitRef) {
    const value = identity.gitRef.startsWith(GITHUB_BRANCH)
      ? identity.gitRef.slice(GITHUB_BRANCH.length)
      : identity.gitRef;
    return { kind: 'branch', value };
  }
  return { kind: 'any', value: '' };
};
