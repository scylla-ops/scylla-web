// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { PasswordResetDelivery } from '@base/generated/scylla/auth/v1/auth.ts';
import { ScyllaResult } from '@shared/utils/scylla-result.ts';
import type { LoginRemoteDataSource } from '../data-sources/login-remote.data-source.ts';
import { DefaultLoginRepository } from '../default-login.repository.ts';

const dataSource = (): LoginRemoteDataSource => ({
  login: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
  requestPasswordReset: vi
    .fn()
    .mockResolvedValue(ScyllaResult.success(PasswordResetDelivery.SERVER_LOG)),
  resetPassword: vi.fn().mockResolvedValue(ScyllaResult.success(undefined)),
});

describe('DefaultLoginRepository', () => {
  it('passes the identifier and the password through', async () => {
    const source = dataSource();

    await new DefaultLoginRepository(source).login('ada@example.com', 'hunter22');

    expect(source.login).toHaveBeenCalledWith('ada@example.com', 'hunter22');
  });

  it('gives the delivery of a reset request in domain terms', async () => {
    const source = dataSource();

    const result = await new DefaultLoginRepository(source).requestPasswordReset('ada@example.com');

    expect(result.unwrap()).toBe('server-log');
    expect(source.requestPasswordReset).toHaveBeenCalledWith('ada@example.com');
  });

  it('passes the token and the new password through', async () => {
    const source = dataSource();

    await new DefaultLoginRepository(source).resetPassword('a-token', 'hunter22');

    expect(source.resetPassword).toHaveBeenCalledWith('a-token', 'hunter22');
  });
});
