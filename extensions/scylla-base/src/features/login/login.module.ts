import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { AuthServiceClient } from '@base/generated/scylla/auth/v1/auth.client.ts';
import type { LoginRepository } from '@base/features/login/domain/repository/login.repository.ts';
import { DefaultLoginRepository } from './infrastructure/default-login.repository.ts';
import { loginPoints } from './presentation/login.points.ts';

const loginRepository: LoginRepository = new DefaultLoginRepository(
  new AuthServiceClient(grpcTransport.getTransport()),
);

export const LoginModule = {
  id: 'login',
  domain: {
    loginRepository,
  },
  routes: {
    public: [
      { path: 'login', page: () => import('./presentation/ui/Login/Login.page.svelte') },
      {
        path: 'forgot-password',
        page: () => import('./presentation/ui/ForgotPassword/ForgotPassword.page.svelte'),
      },
      {
        // The path of the link that the server makes: keep it.
        path: 'reset-password',
        page: () => import('./presentation/ui/ResetPassword/ResetPassword.page.svelte'),
      },
    ],
  },
  points: loginPoints,
} satisfies ScyllaModule;
