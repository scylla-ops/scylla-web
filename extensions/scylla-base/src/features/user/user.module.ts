import type { ScyllaModule } from '@scylla/core-sdk';
import { msg } from '@lingui/core/macro';
import UsersIcon from '@lucide/svelte/icons/users';
import { Permission } from '@platform/authz';
import { UserRemoteDataSourceImpl } from '@base/features/user/infrastructure/data/remote/user-remote.data-source.impl.ts';
import { grpcTransport } from '@platform/grpc';
import { DefaultUserRepository } from '@base/features/user/infrastructure/repository/default-user.repository.ts';

const dataSource = new UserRemoteDataSourceImpl(grpcTransport);
const repository = new DefaultUserRepository(dataSource);

export const UserModule = {
  id: 'user',
  domain: {
    userRepository: repository,
  },
  routes: {
    organization: [
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
        // The account of the session, in the frame of the organization: its calls need no grant.
        path: 'account',
        breadcrumb: () => ({ label: msg`Account` }),
        page: () => import('./presentation/ui/account/Account/Account.page.svelte'),
      },
    ],
    // The same page with no organization: for a user who has none yet.
    personal: [
      {
        path: 'account',
        page: () => import('./presentation/ui/account/PersonalAccount/PersonalAccount.page.svelte'),
      },
    ],
  },
} satisfies ScyllaModule;
