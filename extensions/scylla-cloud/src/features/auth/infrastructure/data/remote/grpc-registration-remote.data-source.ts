import { ScyllaError, ScyllaResult, openSession, type ScyllaGrpcTransport } from '@scylla/base-sdk';
import { t } from '@lingui/core/macro';
import { RegistrationServiceClient } from '../../../../../generated/scylla/registration/v1/registration.client.ts';
import type { RegistrationRemoteDataSource } from '../../repository/data-sources/registration-remote.data-source.ts';
import type { SignupInput } from '../../../domain/repository/registration.repository.ts';

/**
 * `ALREADY_EXISTS`, `INVALID_ARGUMENT` and `UNIMPLEMENTED` get a message the page can show
 * as-is; every other code keeps the generic one `ScyllaResult.tryAsync` already set.
 * See `scylla-cloud-v1_plan.md` §3.
 */
const signupError = (error: ScyllaError): ScyllaError => {
  switch (error.getCode()) {
    case 'ALREADY_EXISTS':
      return new ScyllaError(t`This username or email is already used.`, { cause: error.cause });
    case 'INVALID_ARGUMENT':
      return new ScyllaError(t`Check the fields.`, { cause: error.cause });
    case 'UNIMPLEMENTED':
      return new ScyllaError(t`Sign-up is not available on this server.`, { cause: error.cause });
    default:
      return error;
  }
};

export class GrpcRegistrationRemoteDataSource implements RegistrationRemoteDataSource {
  private readonly _registrationClient: RegistrationServiceClient;

  constructor(transport: ScyllaGrpcTransport) {
    this._registrationClient = new RegistrationServiceClient(transport.getTransport());
  }

  public async signup({
    username,
    email,
    password,
    organizationName,
  }: SignupInput): Promise<ScyllaResult<void>> {
    const result = await ScyllaResult.tryAsync<void>(async () => {
      const { response } = await this._registrationClient.signup({
        username,
        password,
        email: { value: email },
        organizationName,
      });

      openSession(response.token, response.userId?.value ?? '');
    }, 'Failed to sign up.');

    return result.mapError(signupError);
  }
}
