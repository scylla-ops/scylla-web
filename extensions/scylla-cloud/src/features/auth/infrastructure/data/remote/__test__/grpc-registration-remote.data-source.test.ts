// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RpcError } from '@protobuf-ts/runtime-rpc';
import { openSession } from '@scylla/base-sdk';
import type { ScyllaGrpcTransport } from '@scylla/base-sdk';
import { GrpcRegistrationRemoteDataSource } from '../grpc-registration-remote.data-source.ts';
import type { SignupInput } from '../../../../domain/repository/registration.repository.ts';

const signup = vi.fn();

vi.mock('../../../../../../generated/scylla/registration/v1/registration.client.ts', () => ({
  RegistrationServiceClient: class {
    signup = signup;
  },
}));

vi.mock('@scylla/base-sdk', async importOriginal => ({
  ...(await importOriginal<object>()),
  openSession: vi.fn(),
}));

const fakeTransport = { getTransport: () => ({}) } as ScyllaGrpcTransport;

const input: SignupInput = {
  username: 'ravenne',
  email: 'ravenne@example.com',
  password: 'hunter22',
  organizationName: 'Acme',
};

beforeEach(() => {
  signup.mockReset();
  vi.mocked(openSession).mockReset();
});

describe('GrpcRegistrationRemoteDataSource', () => {
  it('opens a session with the token and the user id on success', async () => {
    signup.mockResolvedValue({
      response: { token: 'a-token', userId: { value: 'user-1' }, organizationId: { value: 'org-1' } },
    });
    const dataSource = new GrpcRegistrationRemoteDataSource(fakeTransport);

    const result = await dataSource.signup(input);

    expect(result.unwrap()).toBeUndefined();
    expect(openSession).toHaveBeenCalledWith('a-token', 'user-1');
  });

  it('sends the email wrapped, as the backend expects', async () => {
    signup.mockResolvedValue({ response: { token: 't', userId: { value: 'u' } } });
    const dataSource = new GrpcRegistrationRemoteDataSource(fakeTransport);

    await dataSource.signup(input);

    expect(signup).toHaveBeenCalledWith({
      username: input.username,
      password: input.password,
      email: { value: input.email },
      organizationName: input.organizationName,
    });
  });

  it.each([
    ['ALREADY_EXISTS', 'This username or email is already used.'],
    ['INVALID_ARGUMENT', 'Check the fields.'],
    ['UNIMPLEMENTED', 'Sign-up is not available on this server.'],
  ])('gives a clear message for %s', async (code, message) => {
    signup.mockRejectedValue(new RpcError('from the server', code));
    const dataSource = new GrpcRegistrationRemoteDataSource(fakeTransport);

    const result = await dataSource.signup(input);

    expect(() => result.unwrap()).toThrow(message);
  });

  it('keeps the generic message for any other code', async () => {
    signup.mockRejectedValue(new RpcError('from the server', 'UNAVAILABLE'));
    const dataSource = new GrpcRegistrationRemoteDataSource(fakeTransport);

    const result = await dataSource.signup(input);

    expect(() => result.unwrap()).toThrow('Failed to sign up.');
  });
});
