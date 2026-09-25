import type { ScyllaModule } from '@scylla/core-sdk';
import type { LoginRemoteDataSource } from '@base/features/login/infrastructure/repository/data-sources/login-remote.data-source.ts';
import { GrpcLoginRemoteDataSource } from '@base/features/login/infrastructure/data/remote/grpc-login-remote.data-source.ts';
import type { LoginRepository } from '@base/features/login/domain/repository/login.repository.ts';
import { DefaultLoginRepository } from '@base/features/login/infrastructure/repository/default-login.repository.ts';
import { grpcTransport } from '@platform/grpc';

const loginRemoteDataSource: LoginRemoteDataSource = new GrpcLoginRemoteDataSource(grpcTransport);
const loginRepository: LoginRepository = new DefaultLoginRepository(loginRemoteDataSource);

export const LoginModule = {
  id: 'login',
  domain: {
    loginRepository: loginRepository,
  },
  routes: {
    public: [{ path: 'login', page: () => import('./presentation/ui/Login/Login.page.svelte') }],
  },
} satisfies ScyllaModule;
