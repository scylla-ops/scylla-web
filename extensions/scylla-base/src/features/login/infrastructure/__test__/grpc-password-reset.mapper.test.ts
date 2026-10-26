// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import * as grpcPasswordReset from '../grpc-password-reset.mapper.ts';

describe('grpcPasswordReset.deliveryToDomain', () => {
  it.each([
    [PasswordResetDelivery.MAIL, 'mail'],
    [PasswordResetDelivery.SERVER_LOG, 'server-log'],
    [PasswordResetDelivery.UNSPECIFIED, 'unknown'],
  ] as const)('maps %s to %s', (delivery, expected) => {
    expect(grpcPasswordReset.deliveryToDomain(delivery)).toBe(expected);
  });
});
