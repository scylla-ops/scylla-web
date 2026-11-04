import type { TokenLimits } from '@shared/domain/structs/api-token.struct.ts';

/** The CI providers whose jobs can sign in with their ID token. */
export type CiProvider = 'github' | 'gitlab';

/** The jobs of a repository of a CI provider get tokens of the app, with no secret. */
export interface CiIdentityEntity {
  id: string;
  provider: CiProvider;
  issuer: string;
  /** `owner/repo` on GitHub, `group/project` on GitLab. */
  repository: string;
  /** Empty: each ref. */
  gitRef: string;
  /** Empty: each environment. */
  environment: string;
  limits: TokenLimits;
  createdAt: string;
  /** Empty before its first use. */
  lastUsedAt: string;
}

/** A new CI identity. An empty issuer gives the public service of the provider. */
export interface CreateCiIdentityInput {
  provider: CiProvider;
  issuer: string;
  repository: string;
  gitRef: string;
  environment: string;
  limits: TokenLimits;
}

