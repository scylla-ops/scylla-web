import type { ScyllaModule } from '@scylla/core-sdk';
import { grpcTransport } from '@platform/grpc';
import { AccountServiceClient } from '@base/generated/scylla/accounts/v1/account_service.client.ts';
import { ProfileServiceClient } from '@base/generated/scylla/accounts/v1/profile_service.client.ts';
import { DefaultLoginRepository } from './infrastructure/default-login.repository.ts';
import { resolveUserWith } from './infrastructure/session.ts';
import { loginCommands } from './presentation/login.commands.ts';
import { loginPoints } from './presentation/login.points.ts';

const transport = grpcTransport.getTransport();
const loginRepository = new DefaultLoginRepository(
  new AccountServiceClient(transport),
  new ProfileServiceClient(transport),
);
resolveUserWith(() => loginRepository.currentUserId());

export const LoginModule = {
  id: 'login',
  domain: {
    loginRepository,
  },
  routes: {
    public: [
      { path: 'login', page: () => import('./presentation/ui/Login/Login.page.svelte') },
      { path: 'sign-up', page: () => import('./presentation/ui/SignUp/SignUp.page.svelte') },
      {
        // The path of the link in the mail of the server: keep it.
        path: 'verify-email',
        page: () => import('./presentation/ui/VerifyEmail/VerifyEmail.page.svelte'),
      },
      {
        // The path of the page that the server goes to when an account has the email: keep it.
        path: 'sign-in-link',
        page: () => import('./presentation/ui/SignInLink/SignInLink.page.svelte'),
      },
      {
        // The path of the page that the server goes to when a sign-in fails: keep it.
        path: 'sign-in-error',
        page: () => import('./presentation/ui/SignInError/SignInError.page.svelte'),
      },
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
  commands: loginCommands,
} satisfies ScyllaModule;
