import { msg } from '@lingui/core/macro';
import UsersRound from '@lucide/svelte/icons/users-round';
import { Permission } from '@platform/authz';
import { ACCESS_NAV } from '@shared/presentation/access-nav.ts';
import type { ScyllaModule } from '@scylla/core-sdk';
import { memberCrumbName } from './presentation/member-crumb.state.svelte.ts';
import { membershipPoints } from './presentation/membership.points.ts';

export const MembershipModule = {
  id: 'membership',
  domain: {},
  routes: {
    access: [
      {
        path: 'members',
        permission: Permission.LIST_WORKSPACE_MEMBERS,
        breadcrumb: () => ({ label: msg`Members` }),
        page: () => import('./presentation/ui/WorkspaceMembers/WorkspaceMembers.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Members`,
          icon: UsersRound,
          order: 30,
          group: ACCESS_NAV,
        },
        children: [
          {
            path: ':actorId',
            permission: Permission.LIST_WORKSPACE_MEMBERS,
            breadcrumb: () => ({ label: memberCrumbName() ?? msg`Member` }),
            page: () => import('./presentation/ui/MemberAccess/MemberAccess.page.svelte'),
          },
        ],
      },
    ],
    project: [
      {
        path: 'members',
        permission: Permission.LIST_PROJECT_MEMBERS,
        breadcrumb: () => ({ label: msg`Members` }),
        page: () => import('./presentation/ui/ProjectMembers/ProjectMembers.page.svelte'),
        nav: { section: 'project', title: msg`Members`, icon: UsersRound, order: 30 },
      },
    ],
  },
  points: membershipPoints,
} satisfies ScyllaModule;
