import { i18n } from '@lingui/core';
import type { StatusState } from '@scylla/ui';
import {
  daysUntil,
  type ApiToken,
  type ExpiryState,
  type TokenLimits,
  type TokenPreset,
} from '@shared/domain/structs/api-token.struct.ts';
import { formatDay } from '@shared/utils/date-utils.ts';
import { tokenLabelMessages as messages } from '@shared/presentation/messages/token-labels.messages.ts';

const PRESET = {
  read_only: messages.readOnly,
  deploy: messages.deploy,
  full: messages.full,
  custom: messages.custom,
} as const;

export const tokenPresetText = (preset: TokenPreset): string => i18n._(PRESET[preset]);

/** `Read-only · all projects`. */
export const tokenLimitsText = (limits: TokenLimits): string =>
  `${tokenPresetText(limits.preset)} · ${
    limits.projectIds.length
      ? i18n._(messages.projectCount(limits.projectIds.length))
      : i18n._(messages.allProjects)
  }`;

const EXPIRY_SHAPE: Record<ExpiryState, StatusState> = {
  ok: 'success',
  soon: 'pending',
  expired: 'failed',
  revoked: 'cancelled',
};

export const tokenExpiryShape = (state: ExpiryState): StatusState => EXPIRY_SHAPE[state];

/** `Expires in 9 days`, `Expired on 3 Oct` or `Revoked on 3 Oct`. */
export const tokenExpiryText = (
  token: Pick<ApiToken, 'expiresAt' | 'revokedAt'>,
  state: ExpiryState,
  now: Date,
): string => {
  if (state === 'revoked') return i18n._(messages.revokedOn(formatDay(token.revokedAt)));
  if (state === 'expired') return i18n._(messages.expiredOn(formatDay(token.expiresAt)));
  return i18n._(messages.expiresIn(Math.max(0, daysUntil(token.expiresAt, now))));
};
