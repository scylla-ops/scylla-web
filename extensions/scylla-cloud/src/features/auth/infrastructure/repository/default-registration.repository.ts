import type { ScyllaResult } from '@scylla/base-sdk';
import type {
  RegistrationRepository,
  SignupInput,
} from '../../domain/repository/registration.repository.ts';
import type { RegistrationRemoteDataSource } from './data-sources/registration-remote.data-source.ts';

export class DefaultRegistrationRepository implements RegistrationRepository {
  constructor(private readonly registrationRemoteStore: RegistrationRemoteDataSource) {}

  signup(input: SignupInput): Promise<ScyllaResult<void>> {
    return this.registrationRemoteStore.signup(input);
  }
}
