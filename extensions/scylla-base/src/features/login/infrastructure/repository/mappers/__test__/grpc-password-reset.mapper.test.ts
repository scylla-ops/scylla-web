// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import { GrpcPasswordResetMapper } from '../grpc-password-reset.mapper.ts';

describe('GrpcPasswordResetMapper.deliveryToDomain', () => {
  it.each([
    [PasswordResetDelivery.MAIL, 'mail'],
    [PasswordResetDelivery.SERVER_LOG, 'server-log'],
    [PasswordResetDelivery.UNSPECIFIED, 'unknown'],
  ] as const)('maps %s to %s', (delivery, expected) => {
    expect(GrpcPasswordResetMapper.deliveryToDomain(delivery)).toBe(expected);
  });
});
