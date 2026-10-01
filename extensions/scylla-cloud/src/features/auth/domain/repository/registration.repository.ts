import type { ScyllaResult } from '@scylla/base-sdk';

export interface SignupInput {
  username: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface RegistrationRepository {
  signup(input: SignupInput): Promise<ScyllaResult<void>>;
}
