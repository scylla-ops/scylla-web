import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@scylla/base-sdk';
import type { RegistrationRemoteDataSource } from './infrastructure/repository/data-sources/registration-remote.data-source.ts';
import { GrpcRegistrationRemoteDataSource } from './infrastructure/data/remote/grpc-registration-remote.data-source.ts';
import type { RegistrationRepository } from './domain/repository/registration.repository.ts';
import { DefaultRegistrationRepository } from './infrastructure/repository/default-registration.repository.ts';

const registrationRemoteDataSource: RegistrationRemoteDataSource = new GrpcRegistrationRemoteDataSource(
  grpcTransport,
);
const registrationRepository: RegistrationRepository = new DefaultRegistrationRepository(
  registrationRemoteDataSource,
);

export const CloudAuthModule = {
  id: 'cloud-auth',
  domain: {
    registrationRepository,
  },
  routes: {
    public: [{ path: 'register', page: () => import('./presentation/ui/Register/Register.page.svelte') }],
  },
} satisfies ScyllaModule;
