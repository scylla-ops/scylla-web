import type { ScyllaResult } from '@scylla/base-sdk';
import type { SignupInput } from '../../../domain/repository/registration.repository.ts';

export interface RegistrationRemoteDataSource {
  signup(input: SignupInput): Promise<ScyllaResult<void>>;
}
