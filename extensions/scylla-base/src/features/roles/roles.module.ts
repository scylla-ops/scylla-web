import { msg } from '@lingui/core/macro';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import { Permission } from '@platform/authz';
import { grpcTransport } from '@platform/grpc';
import type { ScyllaModule } from '@scylla/core-sdk';
import { AccessServiceClient } from '@base/generated/scylla/access/v1/access_service.client.ts';
import { RoleServiceClient } from '@base/generated/scylla/access/v1/role_service.client.ts';
import { ACCESS_NAV } from '@shared/presentation/access-nav.ts';
import { DefaultRoleRepository } from './infrastructure/default-role.repository.ts';
import { roleCrumbName } from './presentation/role-crumb.state.svelte.ts';

const transport = grpcTransport.getTransport();
const roleRepository = new DefaultRoleRepository(
  new RoleServiceClient(transport),
  new AccessServiceClient(transport),
);

export const RolesModule = {
  id: 'roles',
  domain: {
    roleRepository,
  },
  routes: {
    instance: [
      {
        path: 'roles',
        permission: Permission.LIST_ROLES,
        breadcrumb: () => ({ label: msg`Roles` }),
        page: () => import('./presentation/ui/InstanceRoles/InstanceRoles.page.svelte'),
        nav: { section: 'instance', title: msg`Roles`, icon: ShieldCheckIcon, order: 20 },
        children: [
          {
            path: 'new',
            permission: Permission.MANAGE_ROLES,
            breadcrumb: () => ({ label: msg`New role` }),
            page: () => import('./presentation/ui/RoleEditor/NewRole.page.svelte'),
          },
          {
            path: ':roleKey',
            permission: Permission.LIST_ROLES,
            breadcrumb: () => ({ label: roleCrumbName() ?? msg`Role` }),
            page: () => import('./presentation/ui/RoleDetail/InstanceRole.page.svelte'),
          },
        ],
      },
    ],
    access: [
      {
        path: 'roles',
        permission: Permission.LIST_WORKSPACE_ROLES,
        breadcrumb: () => ({ label: msg`Roles` }),
        page: () => import('./presentation/ui/WorkspaceRoles/WorkspaceRoles.page.svelte'),
        nav: {
          section: 'workspace',
          title: msg`Roles`,
          order: 31,
          group: ACCESS_NAV,
          permission: Permission.MANAGE_WORKSPACE_ROLES,
        },
        children: [
          {
            path: 'new',
            permission: Permission.MANAGE_WORKSPACE_ROLES,
            breadcrumb: () => ({ label: msg`New role` }),
            page: () => import('./presentation/ui/RoleEditor/NewWorkspaceRole.page.svelte'),
          },
          {
            path: ':roleKey',
            permission: Permission.LIST_WORKSPACE_ROLES,
            breadcrumb: () => ({ label: roleCrumbName() ?? msg`Role` }),
            page: () => import('./presentation/ui/RoleDetail/WorkspaceRole.page.svelte'),
          },
        ],
      },
    ],
  },
} satisfies ScyllaModule;
