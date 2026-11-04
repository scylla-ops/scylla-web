import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import UsersIcon from '@lucide/svelte/icons/users';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import { ProfileServiceClient } from '@base/generated/scylla/accounts/v1/profile_service.client.ts';
import { UserAdminServiceClient } from '@base/generated/scylla/accounts/v1/user_admin_service.client.ts';
import { DefaultUserRepository } from './infrastructure/default-user.repository.ts';
import { accountSection } from './presentation/ui/account/Account/account-sections.registry.ts';

const transport = grpcTransport.getTransport();
const repository = new DefaultUserRepository(
  new ProfileServiceClient(transport),
  new UserAdminServiceClient(transport),
  () => localStorage.getItem('userId'),
);

export const UserModule = {
  id: 'user',
  domain: {
    userRepository: repository,
  },
  routes: {
    workspace: [
      {
        path: 'users',
        permission: Permission.LIST_USERS,
        breadcrumb: () => ({ label: msg`Users` }),
        page: () => import('./presentation/ui/admin/UserAdmin.page.svelte'),
        nav: { section: 'system', title: msg`Users`, icon: UsersIcon, order: 10 },
        children: [
          // The old address of the own settings: the account page replaces it.
          { path: 'me', redirect: '../../account' },
          {
            // No `permission`: the page sends the own id to `account` before it checks READ_USER,
            // so an old link to the own settings works without that permission.
            path: ':userId',
            breadcrumb: () => ({ label: msg`User`, detail: msg`Detail` }),
            page: () => import('./presentation/ui/user-detail/UserDetail/UserDetail.page.svelte'),
          },
        ],
      },
      {
        // The account of the session, in the frame of the workspace: its calls need no grant.
        path: 'account',
        breadcrumb: () => ({ label: msg`Account` }),
        children: [
          { redirect: 'profile' },
          {
            path: ':section',
            inPageParams: ['section'],
            breadcrumb: ({ section }) => ({
              label: accountSection(section)?.title ?? msg`Account`,
            }),
            page: () => import('./presentation/ui/account/Account/Account.page.svelte'),
          },
        ],
      },
    ],
    // The same page with no workspace: for a user who has none yet.
    personal: [
      {
        // The path of the link in the mail of the server: keep it.
        path: 'change-email',
        page: () => import('./presentation/ui/account/ChangeEmail/ChangeEmail.page.svelte'),
      },
      {
        path: 'account',
        children: [
          { redirect: 'profile' },
          {
            path: ':section',
            inPageParams: ['section'],
            page: () =>
              import('./presentation/ui/account/PersonalAccount/PersonalAccount.page.svelte'),
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
