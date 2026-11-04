// The API tokens of the apps and the personal tokens share one message: `scylla.auth.v1.ApiToken`.

import {
  type ApiToken as GrpcApiToken,
  type TokenLimits as GrpcTokenLimits,
  TokenExpiry as GrpcTokenExpiry,
  TokenPreset as GrpcTokenPreset,
} from '@base/generated/scylla/auth/v1/api_token.ts';
import type {
  ApiToken,
  TokenExpiry,
  TokenLimits,
  TokenPreset,
} from '@shared/domain/structs/api-token.struct.ts';
import { idValue, timestampToIso, wrapId } from './wrappers.ts';

/** UNSPECIFIED or a preset newer than this build: read-only, the smallest one. */
const PRESET: Partial<Record<GrpcTokenPreset, TokenPreset>> = {
  [GrpcTokenPreset.READ_ONLY]: 'read_only',
  [GrpcTokenPreset.DEPLOY]: 'deploy',
  [GrpcTokenPreset.FULL]: 'full',
  [GrpcTokenPreset.CUSTOM]: 'custom',
};

const GRPC_PRESET: Record<TokenPreset, GrpcTokenPreset> = {
  read_only: GrpcTokenPreset.READ_ONLY,
  deploy: GrpcTokenPreset.DEPLOY,
  full: GrpcTokenPreset.FULL,
  custom: GrpcTokenPreset.CUSTOM,
};

const GRPC_EXPIRY: Record<TokenExpiry, GrpcTokenExpiry> = {
  7: GrpcTokenExpiry.DAYS_7,
  30: GrpcTokenExpiry.DAYS_30,
  90: GrpcTokenExpiry.DAYS_90,
  365: GrpcTokenExpiry.DAYS_365,
};

export function limitsToDomain(limits: GrpcTokenLimits | undefined): TokenLimits {
  return {
    preset: (limits && PRESET[limits.preset]) ?? 'read_only',
    actions: limits?.actions ?? [],
    projectIds: (limits?.projectIds ?? []).map((id) => idValue(id)),
  };
}

export function limitsToProto(limits: TokenLimits): GrpcTokenLimits {
  return {
    preset: GRPC_PRESET[limits.preset],
    actions: limits.preset === 'custom' ? limits.actions : [],
    projectIds: limits.projectIds.map(wrapId),
  };
}

export function expiryToProto(expiry: TokenExpiry): GrpcTokenExpiry {
  return GRPC_EXPIRY[expiry];
}

export function apiTokenToDomain(token: GrpcApiToken): ApiToken {
  return {
    id: idValue(token.id),
    name: token.name,
    hint: token.hint,
    createdBy: idValue(token.createdBy),
    createdAt: timestampToIso(token.createdAt),
    expiresAt: timestampToIso(token.expiresAt),
    lastUsedAt: timestampToIso(token.lastUsedAt),
    revokedAt: timestampToIso(token.revokedAt),
    limits: limitsToDomain(token.limits),
  };
}
